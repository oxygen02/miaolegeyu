module.exports = function _object_spread_props(target, source) {
  source = source != null ? source : {};
  var ownKeys = Object.keys(source);
  if (typeof Object.getOwnPropertySymbols === 'function') {
    ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
      return Object.getOwnPropertyDescriptor(source, sym).enumerable;
    }));
  }
  ownKeys.forEach(function (key) {
    _define_property(target, key, source[key]);
  });
  return target;
};