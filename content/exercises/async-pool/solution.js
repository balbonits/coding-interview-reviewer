export function asyncPool(limit, tasks) {
  return new Promise((resolve, reject) => {
    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array(tasks.length);
    let next = 0;
    let completed = 0;
    let rejected = false;

    const workerCount = Math.min(limit, tasks.length);

    function runNext() {
      if (rejected) return;
      const i = next++;
      if (i >= tasks.length) return;
      Promise.resolve()
        .then(() => tasks[i]())
        .then(
          (value) => {
            if (rejected) return;
            results[i] = value;
            completed++;
            if (completed === tasks.length) {
              resolve(results);
            } else {
              runNext();
            }
          },
          (err) => {
            if (rejected) return;
            rejected = true;
            reject(err);
          },
        );
    }

    for (let w = 0; w < workerCount; w++) runNext();
  });
}
