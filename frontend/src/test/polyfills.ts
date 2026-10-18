// Loaded before React DOM (see vite.config.ts). Without AnimationEvent, React DOM
// listens to the prefixed "webkitAnimationEnd" and test-fired animation events are lost.
if (typeof window.AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    readonly animationName: string
    readonly elapsedTime: number
    readonly pseudoElement: string

    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init)
      this.animationName = init.animationName ?? ''
      this.elapsedTime = init.elapsedTime ?? 0
      this.pseudoElement = init.pseudoElement ?? ''
    }
  }
  window.AnimationEvent = AnimationEventPolyfill as unknown as typeof AnimationEvent
}

// jsdom does not implement modal dialogs; this is enough for <Modal> to open and close.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
}
