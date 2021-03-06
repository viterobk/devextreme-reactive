import * as React from 'react';
import * as PropTypes from 'prop-types';
// eslint-disable-next-line camelcase
import { unstable_batchedUpdates, findDOMNode } from 'react-dom';
import { TouchStrategy } from './draggable/touch-strategy';
import { MouseStrategy } from './draggable/mouse-strategy';
import { getSharedEventEmitter } from './draggable/shared-events';
import { clear } from './draggable/selection-utils';

const draggingHandled = Symbol('draggingHandled');

export class Draggable extends React.Component {
  constructor(props, context) {
    super(props, context);

    const delegate = {
      onStart: ({ x, y }) => {
        const { onStart } = this.props;
        if (!onStart) return;
        unstable_batchedUpdates(() => {
          onStart({ x, y });
        });
      },
      onMove: ({ x, y }) => {
        const { onUpdate } = this.props;
        if (!onUpdate) return;
        unstable_batchedUpdates(() => {
          onUpdate({ x, y });
        });
      },
      onEnd: ({ x, y }) => {
        const { onEnd } = this.props;
        if (!onEnd) return;
        unstable_batchedUpdates(() => {
          onEnd({ x, y });
        });
      },
    };

    this.mouseStrategy = new MouseStrategy(delegate);
    this.touchStrategy = new TouchStrategy(delegate);

    this.mouseDownListener = this.mouseDownListener.bind(this);
    this.touchStartListener = this.touchStartListener.bind(this);
    this.globalListener = this.globalListener.bind(this);
  }

  componentDidMount() {
    getSharedEventEmitter().subscribe(this.globalListener);
    this.setupNodeSubscription();
  }

  shouldComponentUpdate(nextProps) {
    const { children } = this.props;
    return nextProps.children !== children;
  }

  componentDidUpdate() {
    this.setupNodeSubscription();
  }

  componentWillUnmount() {
    getSharedEventEmitter().unsubscribe(this.globalListener);
  }

  setupNodeSubscription() {
    // eslint-disable-next-line react/no-find-dom-node
    const node = findDOMNode(this);
    if (!node) return;
    node.removeEventListener('mousedown', this.mouseDownListener);
    node.removeEventListener('touchstart', this.touchStartListener);
    node.addEventListener('mousedown', this.mouseDownListener, { passive: true });
    node.addEventListener('touchstart', this.touchStartListener, { passive: true });
  }

  mouseDownListener(e) {
    if (this.touchStrategy.isWaiting() || e[draggingHandled]) return;
    this.mouseStrategy.start(e);
    e[draggingHandled] = true;
  }

  touchStartListener(e) {
    if (e[draggingHandled]) return;
    this.touchStrategy.start(e);
    e[draggingHandled] = true;
  }

  globalListener([name, e]) {
    switch (name) {
      case 'mousemove':
        this.mouseStrategy.move(e);
        break;
      case 'mouseup':
        this.mouseStrategy.end(e);
        break;
      case 'touchmove': {
        this.touchStrategy.move(e);
        break;
      }
      case 'touchend':
      case 'touchcancel': {
        this.touchStrategy.end(e);
        break;
      }
      default:
        break;
    }
    if (this.mouseStrategy.isDragging() || this.touchStrategy.isDragging()) {
      clear();
    }
  }

  render() {
    const { children } = this.props;
    return children;
  }
}

Draggable.propTypes = {
  children: PropTypes.node.isRequired,
  onStart: PropTypes.func,
  onUpdate: PropTypes.func,
  onEnd: PropTypes.func,
};

Draggable.defaultProps = {
  onStart: undefined,
  onUpdate: undefined,
  onEnd: undefined,
};
