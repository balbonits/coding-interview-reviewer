export function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const arr = Array.from(items);
    const results = new Array(arr.length);
    let settled = 0;

    if (arr.length === 0) {
      resolve(results);
      return;
    }

    arr.forEach((item, i) => {
      Promise.resolve(item).then(
        (value) => {
          results[i] = value;
          settled++;
          if (settled === arr.length) resolve(results);
        },
        reject,
      );
    });
  });
}
