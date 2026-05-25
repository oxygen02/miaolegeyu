module.exports = function _wrap_native_super(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;
  _wrap_native_super = function _wrap_native_super(Class) {
    if (Class === null || !_is_native_function(Class)) return Class;
    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);
      _cache.set(Class, Wrapper);
    }
    function Wrapper() {
      return _construct(Class, arguments, _get_prototype_of(this).constructor);
    }
    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _set_prototype_of(Wrapper, Class);
  };
  return _wrap_native_super(Class);
};

function _is_native_function(fn) {
  return Function.prototype.toString.call(fn).indexOf("[native code]") !== -1;
}

function _construct(Parent, args, Class) {
  if (_is_native_reflect_construct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _set_prototype_of(instance, Class.prototype);
      return instance;
    };
  }
  return _construct.apply(null, arguments);
}

function _is_native_reflect_construct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;
  try {
    Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _set_prototype_of(o, p) {
  _set_prototype_of = Object.setPrototypeOf || function _set_prototype_of(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _set_prototype_of(o, p);
}