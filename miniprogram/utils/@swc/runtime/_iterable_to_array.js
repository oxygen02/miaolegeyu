module.exports = function _iterable_to_array(iter) {
  if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) {
    var arr = [];
    var e;
    try {
      for (var i = (iter = iter[Symbol.iterator]()); !(e = i.next()).done; ) {
        arr.push(e.value);
      }
    } catch (err) {
      throw err;
    } finally {
      i["return"]();
    }
    return arr;
  }
  return Array.from(iter);
};