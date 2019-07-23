import React from 'react';
import produce, { applyPatches } from 'immer';

export const event = {
  _id: 1,
  _watchers: {
    change: {},
    go: {},
    push: {},
    pop: {},
    wait: {},
    replace: {},
    popup: {},
    dismiss: {},
  },
  on(type, cb) {
    this._id++;
    this._watchers[type][this._id] = cb;
    return `${type}|${this._id}`;
  },
  off(eventId) {
    const [type, id] = eventId.split('|');
    delete this._watchers[type][id];
  },
  emit(type, page) {
    const _watchers = this._watchers[type];
    Object.keys(_watchers).forEach(key => {
      _watchers[key](page);
    });
    if (type === 'change') {
      console.log('history', page);
    }
  }
};

class Router {
  /**
   * 自增id, 多好啊, 不用造 hash
   */
  _id = 1;
  /**
   * 这里是个二维数组
   * [
   *  [Page, Over?, ...]
   * ]
   */
  _history = [];
  /**
   * 路由表
   */
  _map = {};

  _inverses = [];
  _patchLen = -1;
  _put(data) {
    if (data) {
      this.db = produce(this.db, draft => {
        Object.assign(draft, data);
      }, (patchs, inversePatchs) => {
        this._inverses.push(...inversePatchs);
        this._patchLen = this._inverses.length;
      });
      return this._patchLen - 1;
    }
    return -1;
  }
  _revert(fromIndex) {
    if (fromIndex > -1) {
      const patchs = this._inverses.splice(fromIndex, this._patchLen - fromIndex);
      console.log(patchs);
      this.db = applyPatches(this.db, patchs)
      console.log('db', this.db);
    }
  }
  /**
   * 收集实例, 用来触发 onShow, onHide 钩子用
   */
  _ref(id, ref) {
    let page = null;
    this._history.forEach(nav => {
      nav.forEach(p => {
        if (p.id === id) {
          page = p;
        }
      });
    });
    if (page) {
      page.ref = ref;
    } else {
      // throw new Error(`挂载页面失败 ${id}`);
    }
  }

  _find(element) {
    const navIndex = this._history.findIndex(nav => nav[0].type === element || nav[0].type === this._map[element]);
    return navIndex;
  }
  /**
   * 路由数据的一些处理
   */
  db = {};
  /**
   * 注册路路由表
   * @param {*} path
   * @param {*} page
   */
  registry(path, page) {
    if (this._map[path]) {
      throw new Error(`Router: 路由注册失败, 已经存在路径重复的路由: $${path}`);
    }
    this._map[path] = page;
  }

  has(element) {
    const found = this._find(element) > -1;
    if (found > -1) {
      return this._history[found][0];
    } else {
      return false;
    }
  }


  go(element, data) {
    const found = this._find(element);
    const len = this._history.length;
    if (found === -1) {
      return this.push(element, data);
    }
    if (found === len - 1) {
      return this.replace(element, data);
    }
    // 找到目标后一个, 然后执行 pop
    const willpops = this._history.splice(found + 2, len - found);

    willpops.forEach(nav => {
      if(nav[0].waiting) {
        // 有在等待的 全部 reject 掉
        nav[0].waiting.reject('rejected by go');
      }
    });
    // 路由数据清理
    this._revert(willpops[0][0]._revertIndex);
    this.pop(data);
  }

  push(element, data) {
    this._id++;
    const page = {
      id: this._id,
      name: element && element.name || element.displayName,
      type: element,
    };

    /** path 位置存起来 */
    page._revertIndex = this._put(data);
    const nowNav = this._history[this._history.length - 1];

    return new Promise((resolve, reject) => {
      /**
       * 注意 HTML 元素 div/input 也是字符串, 但是我们的页面都是 Page, 所以不做防御
       */
      try {
        if (typeof element === 'string') {
          page.element = React.createElement(
            this._map[element],
            {
              key: this._id,
              ref: (ref) => this._ref(this._id, ref),
            },
            null);
        } else {
          page.element = React.createElement(
            element,
            {
              key: this._id,
              ref: (ref) => this._ref(this._id, ref),
            },
            null);
        }
      } catch (e) {
        reject(e);
        throw e;
      }
      /**
       * 这里有循环引用, 所以如果有需要 toString 需要重写
       */
      page.router = page;
      if (nowNav && nowNav[0]) {
        nowNav[0].waiting = {
          resolve: (data) => {
            resolve(data);
          },
          reject: (e) => {
            reject(e)
          },
        };
      }


      this._history.push([page]);
      event.emit('push', page);
      event.emit('change', this._history);
    });
  }

  pop(data) {
    if (this._history.length > 1) {
      const prev = this._history[this._history.length - 2][0];
      const top = this._history[this._history.length - 1][0];
      const instance = top.ref;
      const canI = (instance.canI && typeof instance.canI.pop === 'function') ? instance.canI.pop() : Promise.resolve();
      if (canI && typeof canI.then !== 'function') {
        throw new Error(`Page ${top.name} canI.pop: () => Promise<any> must return an promise`);
      }
      canI.then(() => {
        this._history.pop();
        event.emit('pop', top);
        event.emit('change', this._history);
        /**
         * 处理路由数据, 这里有点微妙, 需要好好想想并测试
         */
        this._revert(top._revertIndex);
        this._put(data);
        if (prev.waiting) {
          prev.waiting.resolve(data);
        }
      });
    };
  }

  replace(element, data) {
    this._id++;
    const page = {
      id: this._id,
      name: element && element.name || element.displayName,
      type: element,
    };

    /**
     * 注意 HTML 元素 div/input 也是字符串, 但是我们的页面都是 Page, 所以不做防御
     */
    try {
      if (typeof element === 'string') {
        page.element = React.createElement(
          this._map[element],
          {
            key: this._id,
            ref: (ref) => this._ref(this._id, ref),
          },
          null);
      } else {
        page.element = React.createElement(
          element,
          {
            key: this._id,
            ref: (ref) => this._ref(this._id, ref),
          },
          null);
      }
    } catch (e) {
      throw e;
    }
    /**
     * 这里有循环引用, 所以如果有需要 toString 需要重写
     */
    page.router = page;
    const top = this._history[this._history.length - 1][0];
    /** 先清理掉之前的数据 */
    this._revert(top._revertIndex);
    if (top.waiting) {
      top.waiting.reject('rejected by replace');
    }
    /** 再设置新的数据 */
    page._revertIndex = this._put(data);

    this._history[this._history.length - 1] = [page];
    event.emit('replace', page);
    event.emit('change', this._history);
  }

  popup(element) {
    this._id++;
    const over = {
      id: this._id,
      name: element.name || element.displayName,
      type: element,
      element: React.createElement(
        element,
        {
          key: this._id,
        },
        null
      ),
    };

    const top = this._history[this._history.length - 1][0];
    /**
     * 弹窗层的 router, 很显然, 是当前 Page
     */
    over.router = top;

    top.push(over);
    event.emit('popup', over);
    event.emit('change', this._history);
  }

  dismiss() {
    const top = this._history[this._history.length - 1];
    // 有弹窗的时候才删除, 否则, 不触发
    if (top.length > 1) {
      const dismissed = top.splice(this._history.length - 1, 1);
      event.emit('dismiss', dismissed[0]);
      event.emit('change', this._history);
    }
  }
}

const router = new Router();

export default router;
