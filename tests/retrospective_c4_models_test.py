"""Mathematical fixtures for conditional paired whole-school donors."""
import copy
import pathlib
import sys
import unittest
import numpy as np

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from retrospective_c4_models import fit, forecast, refit_c2, donor_weights, sample_school_noise


def school(unitid,tuition=100.,housing=200.,scale=0.,constant=False):
    rows=[dict(unitid=unitid,year=2000,tuition=tuition,housing=housing,deflator=1.)]
    variation=[.01,-.03,.02,0.,-.02,.02]
    for j,shock in enumerate(variation,2001):
        old=rows[-1]
        common=0 if constant else (-1)**j*.005
        individual=0 if constant else scale*shock
        rows.append(dict(unitid=unitid,year=j,tuition=old['tuition']*np.exp(np.log(1.04)+common+individual),
                         housing=old['housing']*np.exp(np.log(1.03)+common/2+individual/2),
                         deflator=old['deflator']*1.02))
    return rows


def fixture(constant=False):
    fits=school(3,scale=-.5,constant=constant)+school(4,scale=0,constant=constant)+school(5,scale=.5,constant=constant)
    cals=school(1,100,200,.5,constant)+school(2,400,800,1.5,constant)+school(8,900,1800,.1,constant)
    return fit(fits,cals,2006,test_unitids=(7,15)),school(15,250,500,.4,constant)


class ConditionalDonorMathTests(unittest.TestCase):
    def test_donor_center_and_feature_scale_definitions(self):
        model,_=fixture()
        for donor in model['donors']:
            np.testing.assert_allclose(donor['vectors'].mean(axis=0),[0,0],atol=1e-16)
        expected=np.maximum(np.std(model['features'],axis=0,ddof=0),.25)
        np.testing.assert_array_equal(model['feature_scales'],expected)
        self.assertEqual(model['audit']['fitInstitutions'],3)
        self.assertEqual(model['audit']['calDonors'],3)

    def test_kernel_is_conditional_plus_twenty_percent_uniform(self):
        model,_=fixture(); anchor=np.exp(model['features'][0,:2])
        raw=np.exp(-.5*np.sum(((model['features'][:,:2]-np.log(anchor))/model['feature_scales'][:2])**2,axis=1))
        expected=.8*raw/raw.sum()+.2/len(raw)
        np.testing.assert_allclose(donor_weights(model,anchor),expected,atol=1e-16)
        self.assertTrue(np.all(expected>=.2/3))
        np.testing.assert_allclose(donor_weights(model,[1e300,1e300]),[1/3]*3,atol=1e-16)

    def test_one_donor_support_is_retained_for_entire_paired_path(self):
        model,_=fixture();weights=donor_weights(model,[300,600])
        noise,chosen=sample_school_noise(model,weights,17,70,18,'cold:7',return_donors=True)
        for trial,donor in enumerate(chosen):
            support=model['donors'][donor]['vectors']
            for pair in noise[trial]:
                self.assertTrue(np.any(np.all(pair[None,:]==support,axis=1)))
        shorter,short_choices=sample_school_noise(model,weights,3,70,18,'cold:7',return_donors=True)
        np.testing.assert_array_equal(short_choices,chosen)
        np.testing.assert_array_equal(shorter,noise[:,:3,:])

    def test_constant_growth_reconstructs_nominal_anchor(self):
        model,history=fixture(constant=True)
        anchor=[history[-1]['tuition'],history[-1]['housing']]
        for paths in (forecast(model,anchor,9,23,101,unitid=15,history=history),
                      refit_c2(model,anchor,9,23,101,unitid=15,history=history)):
            np.testing.assert_allclose(paths,np.broadcast_to([1.04,1.03],paths.shape),atol=1e-14)

    def test_known_history_is_feature_only_and_prefix_coherent(self):
        model,history=fixture();before=copy.deepcopy(model['core'])
        anchor=[history[-1]['tuition'],history[-1]['housing']]
        long=forecast(model,anchor,11,31,26,unitid=15,history=history)
        short=forecast(model,anchor,3,31,26,unitid=15,history=history)
        np.testing.assert_array_equal(short,long[:,:3,:])
        self.assertNotIn('15',model['core']['school_states'])
        for key in ('mu','rho','common_vectors','school_vectors'):
            np.testing.assert_array_equal(model['core'][key],before[key])
        with self.assertRaises(ValueError):forecast(model,anchor,3,unitid=None,history=history,school_key='cold:7')

    def test_same_key_reuses_path_and_different_keys_keep_common_but_change_school(self):
        model,_=fixture()
        a=forecast(model,[300,600],11,51,17,school_key='cold:7')
        b=forecast(model,[300,600],11,51,17,school_key='cold:7')
        c=forecast(model,[300,600],11,51,17,school_key='cold:999')
        np.testing.assert_array_equal(a,b)
        self.assertFalse(np.array_equal(a,c))
        self.assertTrue(np.isfinite(a).all() and (a>0).all())


if __name__=='__main__':unittest.main()
