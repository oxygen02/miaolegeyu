Component({
  properties: {
    type: {
      type: String,
      value: 'card' // text, card, list, banner, avatar
    },
    count: {
      type: Number,
      value: 3
    },
    active: {
      type: Boolean,
      value: true
    }
  }
});