# Desktop trial fix baseline

This checkpoint collects the dialogue, vehicle recovery, landing and performance fixes tested during the desktop trial. It preserves the original motion curves and resource files. A10 retains its `needsAdjustment` status and remains outside the autonomous action pool.

- Dialogue placement follows character size and the actual head anchor, including vehicle and combat adapters.
- Insufficient riding space selects one inward recovery ride where the vehicle can fit safely.
- Post-contact landing recovery is faster; airborne motion is preserved.
- A10/A11 batch GPU readbacks, limit material processing to the occupied region and reduce repeated joint work. A12 prepares size-specific material samples before showing the action.
- SI interactions reuse geometry buffers, reduce transparent-region calculations with conservative boundaries, and prewarm later landing poses. Complete rigid meshes are retained to preserve edge rendering.

## Validation already performed

The local Windows Electron trial included 82 desktop regression checks, 339 glove comparison frames at 100/150/300px, and SI full/optimized geometry comparisons with repeated-render controls. Material-kernel comparisons covered 126,524,800 channels without numerical differences; rigid-matrix comparisons covered 30,842,500 Float32 values without differences. All 601 original asset files remained unchanged. Tiny raster color differences were evaluated against repeated-render controls; the images are not claimed to be byte-identical.

These are recorded local results, not an automated CI suite. Some transitions still exceed the 16.7ms frame budget under load. An existing cancelled-load Promise may remain unresolved; action-generation isolation prevents the old action from reappearing, but that lifecycle issue is not resolved in this checkpoint.

## Launch and release state

The author's desktop shortcut and legacy launch script were found to be starting an older production-development host. They were redirected locally to the tested standalone executable, with settings migrated and the old entry backed up. A further 28 dialogue checks ran against the actual installed runtime. Those machine-specific shortcut/settings changes are outside this repository and are not part of this commit.

The source directory and an installed program are separate copies. A source commit does not update an existing installation: refresh the manifest, build and validate the runtime, and verify the actual shortcut target when installing. The previously published v0.1.0 download has not been replaced by these local trial fixes.
