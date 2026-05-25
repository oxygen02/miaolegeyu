module.exports = function _create_class(Constructor, protoProps, staticProps) {
  if (protoProps) _define_properties(Constructor.prototype, protoProps);
  if (staticProps) _define_properties(Constructor, staticProps);
  return Constructor;
};

function _define_properties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}