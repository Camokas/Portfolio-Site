// Each request owns its image. Only the latest complete image/metadata pair
// may become interactive, even when an older decode finishes afterwards.
export function createAtlasLoader({loadData, loadImage, onStart, onReady, onError, onFinish}) {
  let generation = 0, controller;
  return {
    async select(selection) {
      const id = ++generation;
      controller?.abort();
      const request = controller = new AbortController();
      const current = () => id === generation && !request.signal.aborted;
      onStart();
      try {
        const [data, image] = await Promise.all([
          loadData(selection.manifest, request.signal), loadImage(selection.src, request.signal),
        ]);
        if (!current()) return false;
        if (data.width !== image.naturalWidth || data.height !== image.naturalHeight || !data.sprites?.length) throw new Error('Atlas dimensions differ');
        onReady({data, image, selection});
        return true;
      } catch (error) {
        if (current()) onError(error, selection);
        return false;
      } finally {
        if (current()) onFinish();
      }
    },
    cancel() { generation++; controller?.abort(); },
  };
}
