# Results lifecycle regression checks

Use synthetic data in a browser. These exercise actual DOM, events, storage and worker behavior; the Node financial suite alone does not cover them.

1. Load a saved plan with nonzero costs and savings. The projection must appear without clicking Calculate.
2. Edit savings from $25,000 to $50,000. The results must never become hidden. After a short pause, entry savings must double when the contribution is zero; any old Monte Carlo result must be replaced by a current projection and an invitation to rerun the simulation.
3. Enter negative savings. The previous result stays visible, clearly marked as previous. An error appears beside the buttons; report/CSV/print actions are disabled.
4. Correct savings. The projection updates, previous-result markings clear, and exports are enabled.
5. Edit an input and immediately click Run Monte Carlo (before the automatic-refresh delay). The pending refresh must be cancelled; after completion both the projection and Monte Carlo results remain visible.
6. Save locally and reload. Saved inputs and the regenerated projection appear automatically; simulation is explicitly rerun rather than represented as persisted.
7. Switch student/scenario. Show that selection's projection immediately, with its own name and values.
8. Change enrollment, then edit another input. Default contribution dates follow enrollment and must not revert to stale hidden values.
9. Clear a required enrollment month. Preserve the previous result, show the error, then recover after a valid date is entered.
10. At phone and iPad-sized widths, results do not widen the page. The View results link next to the calculation status reaches the results without requiring a long manual scroll.

Observed before v0.1.2: input events hid results immediately and left Assessment complete at the top of the page. Saved plans loaded only inputs and showed an empty result placeholder. Both paths are corrected in v0.1.2.
