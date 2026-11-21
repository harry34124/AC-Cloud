exports.run = async function ({ mode }) {
  const pet = window.cloudPet,
    s = pet.getScene(),
    d = pet.getDaily();
  d.setAuto(false);
  d.interrupt();
  s.acceptNeutral();
  s.setPaused(true);
  s.setWords(false);
  await s.prepareInteractions();
  if (mode === 'regression') {
    s.setPaused(false);
    const startup = await pet.runChecks(),
      checks = [...startup.checks];
    d.setAuto(false);
    d.interrupt();
    for (let i = 0; i < 3; i++) {
      const pending = d.forcePlay('A13', { source: 'cancel-check' });
      d.interrupt();
      const outcome = await Promise.race([
        pending,
        new Promise((r) => setTimeout(() => r('timeout'), 3000)),
      ]);
      checks.push({
        name: 'cancel in-flight load settles ' + i,
        pass: outcome === false && !d.busy() && !document.querySelector('.action-context'),
      });
    }
    for (const size of [100, 150, 300])
      for (const id of ['A10', 'A11']) {
        s.setPosition(0.5);
        s.fit(size);
        s.setPaused(false);
        const loaded = await d.forcePlay(id, { source: 'trial-w15' });
        const a = d.inspect();
        checks.push({ name: id + ' ' + size + ' real desktop load/prewarm', pass: loaded && !!a });
        if (!a) continue;
        for (const time of id === 'A10'
          ? [0, 0.73, 0.82, 0.939, 1, 6.8, 7.43, 7.65, 7.799]
          : [0, 0.8, 3.5, 7.63, 7.75, 7.95]) {
          a.time = time;
          a.lastRenderKey = null;
          d.render();
          checks.push({ name: id + ' ' + size + ' render ' + time, pass: !d.state().dailyError });
        }
        await d.forcePlay('A13', { source: 'trial-w15' });
        checks.push({
          name: id + ' ' + size + ' interruption to A13',
          pass: d.inspect()?.id === 'A13',
        });
        d.interrupt();
        checks.push({
          name: id + ' ' + size + ' neutral cleanup',
          pass: s.getState().mode === 'A01' && !d.busy(),
        });
      }
    // A50's A15 followup must transfer the prewarmed iframe, not reload or dispose it.
    s.setPosition(0.5);
    s.fit(150);
    s.setPaused(false);
    const headpatLoaded = await d.forcePlay('A50', {
      source: 'followup-check',
      followupPreview: true,
    });
    const headpat = d.inspect();
    checks.push({
      name: 'A50 prewarms A15 before showing',
      pass: headpatLoaded && headpat?.prefetch?.ready,
    });
    if (headpat) {
      const cachedFrame = headpat.prefetch?.frame;
      headpat.time = headpat.duration;
      headpat.lastRenderKey = null;
      d.render();
      d.step(0.01);
      for (let i = 0; i < 600 && (d.state().dailyLoading || d.inspect()?.id !== 'A15'); i++)
        await new Promise((r) => setTimeout(r, 20));
      const follow = d.inspect();
      checks.push({
        name: 'A15 borrows the same prewarmed iframe',
        pass: follow?.id === 'A15' && follow.frame === cachedFrame,
      });
      if (follow) {
        follow.time = follow.duration;
        follow.lastRenderKey = null;
        d.render();
      }
      checks.push({
        name: 'followup returns to neutral and removes both contexts',
        pass:
          !d.busy() &&
          s.getState().mode === 'A01' &&
          !document.querySelector('.action-context,.prepared-context'),
      });
      d.interrupt();
    }
    const disposingLoad = d.forcePlay('A13', { source: 'dispose-check' });
    d.dispose();
    const disposedResult = await Promise.race([
      disposingLoad,
      new Promise((r) => setTimeout(() => r('timeout'), 3000)),
    ]);
    await new Promise((r) => setTimeout(r, 0));
    checks.push({
      name: 'host disposal cancels a pending load and removes all frame contexts',
      pass:
        disposedResult === false &&
        !d.busy() &&
        !document.querySelector('.action-context,.prepared-context') &&
        !d.layer.isConnected,
    });
    return { pass: checks.every((c) => c.pass), checks, state: pet.getState() };
  }
  return { pass: false, error: 'Unknown test mode' };
};
