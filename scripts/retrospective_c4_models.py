"""Conditional whole-school paired donors, revised-data research only.

Population fitting, held-out donor histories and evaluated institutions are
disjoint. No population quantity is fitted from a TEST school's own history.
"""
import copy
import numpy as np

from retrospective_inputs import identity_hash
from retrospective_cost_models import fit as population_fit, _segments, _sample_blocks, _seed, PHI, KAPPA
from retrospective_c2_models import forecast_pair as c2_forecast_pair, NOMINAL_ANCHOR

METHOD = 'conditional-whole-school-donors-1.0.0'
MIN_DONORS = 3
MAX_INSTITUTIONS = 200
FEATURE_SCALE_FLOOR = .25
CONDITIONAL_WEIGHT = .8


def _clean(records, cutoff, expected_unitid=None):
    grouped = {}
    for record in records:
        year = record['year']
        if not isinstance(year, (int, np.integer)):
            raise ValueError('Integer academic year required')
        if year > cutoff:
            continue
        unitid = str(record['unitid'])
        if expected_unitid is not None and unitid != str(expected_unitid):
            raise ValueError('Known-school history contains another identity')
        values = np.array([record[k] for k in ('tuition','housing','deflator')], dtype=float)
        if not np.isfinite(values).all() or not (values > 0).all():
            raise ValueError('Positive finite paired prices/CPI required')
        rows = grouped.setdefault(unitid,{})
        if int(year) in rows:
            raise ValueError('Duplicate institution-year')
        rows[int(year)] = values
    return grouped


def _history_info(rows, common_nominal, prior_variance):
    years, residuals = [], []
    for year in sorted(rows):
        if year-1 in rows and year in common_nominal:
            growth = np.log(rows[year][:2])-np.log(rows[year-1][:2])
            years.append(year); residuals.append(growth-common_nominal[year])
    residuals = np.asarray(residuals,dtype=float).reshape((-1,2))
    n = len(residuals)
    variance = np.var(residuals,axis=0,ddof=0) if n else np.zeros(2)
    shrunk = (n*variance+KAPPA*prior_variance)/(n+KAPPA)
    rms = np.sqrt(shrunk)
    # Numeric representation of exact zero only; no predictive variance floor.
    log_rms = np.log(np.maximum(rms,np.finfo(float).tiny))
    return {'years':years,'residuals':residuals,'n':n,'log_rms':log_rms}


def fit(fit_records, cal_records, origin, test_unitids=(), training_cutoff=None):
    cutoff = origin if training_cutoff is None else training_cutoff
    if not isinstance(origin,(int,np.integer)) or not isinstance(cutoff,(int,np.integer)) or cutoff>origin:
        raise ValueError('Invalid origin/training cutoff')
    tests = {str(u) for u in test_unitids}
    fit_rows, cal_rows = _clean(fit_records,cutoff), _clean(cal_records,cutoff)
    if len(fit_rows)>MAX_INSTITUTIONS or len(cal_rows)>MAX_INSTITUTIONS:
        raise ValueError('Frozen institution cap exceeded')
    for unitid in fit_rows:
        if unitid in tests or identity_hash(unitid)%5 not in (2,3,4):
            raise ValueError('Invalid FIT institution role')
    for unitid in cal_rows:
        if unitid in tests or identity_hash(unitid)%5 != 1:
            raise ValueError('Invalid CAL institution role')
    # The internal population fit receives only admitted cutoff rows, including
    # for the lag view where its forecast origin is later than its information.
    core = population_fit([
        {'unitid':u,'year':year,'tuition':v[0],'housing':v[1],'deflator':v[2]}
        for u,rows in fit_rows.items() for year,v in rows.items()
    ],int(origin),excluded_unitids=tests)
    common = core['common_vectors']+core['mu']
    common_nominal = {year:common[i,:2]+common[i,2] for i,year in enumerate(core['years'])}
    prior_variance = np.mean(core['school_vectors']**2,axis=0)
    donors, omitted = [], []
    for unitid in sorted(cal_rows,key=lambda u:(identity_hash(u),int(u))):
        rows = cal_rows[unitid]
        info = _history_info(rows,common_nominal,prior_variance)
        if cutoff not in rows or info['n']<3:
            omitted.append(unitid); continue
        centered = info['residuals']-info['residuals'].mean(axis=0)
        features = np.r_[np.log(rows[cutoff][:2]),info['log_rms']]
        donors.append({'unitid':unitid,'vectors':centered,'years':info['years'],
                       'features':features,'n':info['n']})
    if len(donors)<MIN_DONORS:
        raise ValueError('At least three usable CAL school donors required')
    features = np.array([d['features'] for d in donors])
    scales = np.maximum(np.std(features,axis=0,ddof=0),FEATURE_SCALE_FLOOR)
    vectors, next_indices, offsets, lengths = [], [], [], []
    for donor in donors:
        offset = len(vectors); n = donor['n']
        offsets.append(offset); lengths.append(n)
        vectors.extend(donor['vectors'])
        local_next = np.empty(n,dtype=int)
        for segment in _segments([('school',year) for year in donor['years']]):
            for position,index in enumerate(segment):
                local_next[index] = offset+segment[(position+1)%len(segment)]
        next_indices.extend(local_next)
    audit = {'fitIds':sorted(fit_rows,key=int),'calIds':[d['unitid'] for d in donors],
             'testIds':sorted(tests,key=int),'fitInstitutions':len(fit_rows),
             'calProposed':len(cal_rows),'calDonors':len(donors),'omittedCalIds':omitted,
             'years':core['years'],'trainingCutoff':int(cutoff),'origin':int(origin),
             'featureScales':scales.tolist()}
    return {'method':METHOD,'core':core,'donors':donors,'features':features,
            'feature_scales':scales,'test_unitids':tests,'training_cutoff':int(cutoff),
            'common_nominal':common_nominal,'prior_variance':prior_variance,
            'donor_vectors':np.asarray(vectors),'next_indices':np.asarray(next_indices),
            'donor_offsets':np.asarray(offsets),'donor_lengths':np.asarray(lengths),'audit':audit}


def _anchor(anchor):
    if isinstance(anchor,dict):
        anchor = [anchor['tuition'],anchor['housing']]
    anchor = np.asarray(anchor,dtype=float)
    if anchor.shape!=(2,) or not np.isfinite(anchor).all() or not (anchor>0).all():
        raise ValueError('Positive finite paired origin anchor required')
    return anchor


def _target_info(fitted, anchor, unitid, history):
    anchor = _anchor(anchor)
    if unitid is None:
        if history is not None and len(history):
            raise ValueError('Cold-start target cannot supply its own history')
        return np.log(anchor), None
    if str(unitid) not in fitted['test_unitids']:
        raise ValueError('Known target is not in the excluded TEST set')
    if history is None:
        raise ValueError('Known TEST history is required for known features')
    rows = _clean(history,fitted['training_cutoff'],expected_unitid=unitid).get(str(unitid),{})
    info = _history_info(rows,fitted['common_nominal'],fitted['prior_variance'])
    feature = np.r_[np.log(anchor),info['log_rms']]
    state = None
    if info['n']:
        state = {'n':info['n'],'last_year':info['years'][-1],
                 'last_residual':info['residuals'][-1]}
    return feature,state


def donor_weights(fitted, anchor, unitid=None, history=None):
    feature,_ = _target_info(fitted,anchor,unitid,history)
    dimension = len(feature)
    distance = (fitted['features'][:,:dimension]-feature[None,:])/fitted['feature_scales'][None,:dimension]
    with np.errstate(under='ignore'):
        kernel = np.exp(-.5*np.sum(distance**2,axis=1))
    total = kernel.sum()
    kernel = kernel/total if total>0 and np.isfinite(total) else np.full(len(kernel),1/len(kernel))
    return CONDITIONAL_WEIGHT*kernel+(1-CONDITIONAL_WEIGHT)/len(kernel)


def sample_school_noise(fitted, weights, horizon, trials, seed, school_key, return_donors=False):
    """One donor identity per trial, paired within-school circular block2."""
    rng = np.random.default_rng(_seed(seed,school_key))
    chosen = rng.choice(len(fitted['donors']),size=trials,p=weights)
    output = np.empty((trials,horizon,2))
    for h in range(0,horizon,2):
        indices = fitted['donor_offsets'][chosen] + np.floor(
            rng.random(trials)*fitted['donor_lengths'][chosen]).astype(int)
        for offset in range(min(2,horizon-h)):
            output[:,h+offset] = fitted['donor_vectors'][indices]
            indices = fitted['next_indices'][indices]
    return (output,chosen) if return_donors else output


def refit_c2(fitted, anchor, horizon, trials=512, seed=2026112701,
             unitid=None, history=None, school_key=None):
    """C2 on exactly the new FIT pool, with known history feature-only."""
    _,state = _target_info(fitted,anchor,unitid,history)
    if school_key is None and unitid is not None:
        school_key = f'known:{unitid}'
    core = copy.copy(fitted['core'])
    core['school_states'] = dict(core['school_states'])
    if unitid is not None and state is not None:
        core['school_states'][str(unitid)] = state
    return c2_forecast_pair(core,unitid,horizon,trials,seed,school_key)['C2']


def forecast(fitted, anchor, horizon, trials=512, seed=2026112701,
             unitid=None, history=None, school_key=None):
    if not isinstance(horizon,(int,np.integer)) or horizon<1 or not isinstance(trials,(int,np.integer)) or trials<1:
        raise ValueError('Positive integer horizon/trials required')
    if school_key is None:
        if unitid is None:raise ValueError('Cold-start target requires a stable key')
        school_key = f'known:{unitid}'
    _,state = _target_info(fitted,anchor,unitid,history)
    weights = donor_weights(fitted,anchor,unitid,history)
    core = fitted['core']; centered = core['common_vectors']; rng = np.random.default_rng(int(seed))
    indices = rng.integers(0,len(centered),size=(trials,len(centered)))
    delta = centered[indices].mean(axis=1)
    delta_nominal = delta[:,:2]+delta[:,2,None]
    common = _sample_blocks(centered,core['common_segments'],horizon,trials,rng)
    common_nominal = common[:,:,:2]+common[:,:,2,None]
    recent = (centered[-3:]+core['mu']).mean(axis=0)
    recent_nominal = recent[:2]+recent[2]
    h = np.arange(1,horizon+1)[:,None]
    log_paths = NOMINAL_ANCHOR[None,None,:] + PHI**h[None,:,:]*(
        (recent_nominal-NOMINAL_ANCHOR)[None,None,:]+delta_nominal[:,None,:]) + common_nominal
    if state is not None:
        gap = core['origin']-state['last_year']
        log_paths = log_paths + (state['n']/(state['n']+KAPPA)*
            core['rho'][None,:]**(h+gap)*state['last_residual'][None,:])[None,:,:]
    log_paths = log_paths + sample_school_noise(fitted,weights,horizon,trials,seed,school_key)
    with np.errstate(over='raise',under='raise',invalid='raise'):
        try:result = np.exp(log_paths)
        except FloatingPointError as error:raise ValueError('Nonfinite conditional donor increment') from error
    if not np.isfinite(result).all() or not (result>0).all():
        raise ValueError('Invalid conditional donor paths')
    return result
