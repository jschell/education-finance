"""Separate FIT/CAL/TEST input roles for the fixed C4 research contract."""
from retrospective_inputs import cohort_at, context, identity_hash, price_at, outcome, digest


def test_selections(table,origin,sectors):
    selections={s:cohort_at(table,origin,s) for s in sectors}
    excluded=sorted({u for a in selections.values() for k in ('known_ids','unknown_ids') for u in a[k]})
    return selections,excluded


def role_ids(table,origin,sector,test_ids,eligible=None):
    # Origin-local eligibility, never outer-survivor filtering at an inner origin.
    eligible=cohort_at(table,origin,sector,fit_cap=10**9) if eligible is None else eligible if eligible is None else eligible
    excluded=set(test_ids)
    fit=[u for u in eligible['fit_ids'] if identity_hash(u)%5 in (2,3,4) and u not in excluded][:200]
    cal=[u for u in eligible['fit_ids'] if identity_hash(u)%5==1 and u not in excluded][:200]
    if set(fit)&set(cal) or excluded&(set(fit)|set(cal)):raise ValueError('Role overlap')
    return fit,cal,eligible


def records_for(table,cpi,unitids,cutoff,sector):
    records=[]
    for u in unitids:
        for year in range(2000,cutoff+1):
            p=price_at(table,u,year,sector)
            if p['status']!='observed' or not cpi.get(year,0)>0:raise ValueError('Invalid admitted role history')
            records.append({'unitid':u,'year':year,'tuition':p['tuition'],'housing':p['housing'],'deflator':cpi[year]})
    return records


def role_context(table,cpi,origin,sector,lag,test_ids,eligible=None):
    fit_ids,cal_ids,eligible=role_ids(table,origin,sector,test_ids,eligible=eligible)
    cutoff=origin-lag
    fit_records=records_for(table,cpi,fit_ids,cutoff,sector)
    cal_records=records_for(table,cpi,cal_ids,cutoff,sector)
    payload={'origin':origin,'sector':sector,'cutoff':cutoff,'lag':lag,'test_ids':sorted(test_ids),'fit_ids':fit_ids,'cal_ids':cal_ids,'fit_records':fit_records,'cal_records':cal_records}
    payload['inputHash']=digest(payload)
    return payload


def bill_records(table,outerorigin,sector,test_ids,cutoff,cohort_bank=None):
    """All origin-local CAL slots; unavailable labels remain auditable."""
    result=[]
    for inner in range(2003,outerorigin-3):
        _,cal_ids,_=role_ids(table,inner,sector,test_ids,eligible=cohort_bank[(inner,sector)] if cohort_bank is not None else None)
        for u in cal_ids:
            anchor=price_at(table,u,inner,sector)
            truth=outcome(table,u,inner,0,sector)
            row={'labelOrigin':inner,'lastBillYear':inner+3,'unitid':u,'sector':sector,'anchor':[anchor['tuition'],anchor['housing']],'status':truth['status']}
            if row['lastBillYear']>=outerorigin or row['lastBillYear']>cutoff:raise ValueError('Immature bill admitted')
            if truth['status']=='observed':row['bill']=truth['total']
            result.append(row)
    return result
