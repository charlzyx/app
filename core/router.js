import React from 'react';
import { AppState } from 'react-native';
import produce, { applyPatches } from 'immer';


const ANIMATE_DURATION = 233;

const EXCEPTION = {
  // 没有路由历史
  NO_MORE_HISTORY: 'NO_MORE_HISTORY',
  // 被 go 里面强行 splice 掉的
  REJECTED_BY_GO: 'REJECTED_BY_GO',
  // 被 replace 强行替换掉的
  REJECTED_BY_REPLACE: 'REJECTED_BY_GO',
  // 被 Page 里面的 beforeLeave reject 掉的
  BEFORE_LEAVE_RETURN_NO_PROMISE: 'BEFORE_LEAVE_RETURN_NO_PROMISE',
  // 路由 path 重复
  MUTIPLE_ROUTE_PATH: 'MUTIPLE_ROUTE_PATH',
};

/**
 * 路由事件管理器
 */
export const event = {
  _id: 1,
  _watchers: {},
  on(cb) {
    this._id++;
    this._watchers[this._id] = cb;
    return `${this._id}`;
  },
  off(id) {
    delete this._watchers[id];
  },
  emit(routeInfo) {
    Object.keys(this._watchers).forEach(key => {
      this._watchers[key](routeInfo);
    });
    console.log('history', routeInfo);
  }
};

const wait = (time) => new Promise(resolve => {
  setTimeout(resolve, time);
});

/**
 * 路由
 * 要添加 hook 支持的话, 那么, 接口的 promiseify 是必须的
 * 动画估计也要这玩意
 */
class Router {
  /**
   * 自增id, 多好啊, 不用造 hash
   */
  _id = 1;
  /**
   * beforeEnter 钩子
   * beforeLeave 钩子
   */
  _hooks = {
    beforeEnter: [],
    beforeLeave: [],
  };
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
  /**
   * 反向 patches, 感谢 immer
   * [https://github.com/immerjs/immer#patches](https://github.com/immerjs/immer#patches)
   */
  _inverses = [];
  /**
   * 添加参数
   */
  _put(data) {
    if (data) {
      this.db = produce(this.db, draft => {
        Object.assign(draft, data);
      }, (patchs, inversePatchs) => {
        this._inverses.push(...inversePatchs);
      });
      return this._inverses.length - 1;
    }
    return -1;
  }
  /**
   * 根据路由栈, 自动清理db
   */
  _revert(revertIndex) {
    if (revertIndex > -1) {
      const patchs = this._inverses.splice(revertIndex, this._inverses.length - revertIndex);
      this.db = applyPatches(this.db, patchs)
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
    console.log(this._history);
    if (page) {
      page.ref = ref;
    }
    // 会没有吗? 会的, pop 的时候会触发 pop 掉的 ref, 暂时还不知道为什么
  }
  /**
   * 查找页面所在位置
   */
  _find(page) {
    const navIndex = this._history.findIndex(nav => nav[0].type === page || nav[0].type === this._map[page]);
    return navIndex;
  }
  /** 判断当前栈顶页面能否返回 */
  _canIPop() {
    const top = this._history[this._history.length - 1][0];
    const ref = top.ref;
    const canI = typeof ref.beforeLeave === 'function' ? ref.beforeLeave(top) : Promise.resolve();
    if (canI && typeof canI.then !== 'function') {
      reject(`${EXCEPTION.BEFORE_LEAVE_RETURN_NO_PROMISE} | in ${top.name} beforeLeave: () => Promise<any> must return an promise`);
      throw new Error(`${EXCEPTION.BEFORE_LEAVE_RETURN_NO_PROMISE} | in ${top.name} beforeLeave: () => Promise<any> must return an promise`);
    }
    return Promise.all(this._hooks.beforeLeave.map(hook => hook(top).concat(canI)));
  }
  /**
   * 路由数据的一些处理
   */
  db = {};
  /**
   * 注册静态路由表
   * @param {*} path
   * @param {*} Page
   */
  registry(path, page) {
    if (this._map[path]) {
      throw new Error(`${EXCEPTION.MUTIPLE_ROUTE_PATH} | 路由路径重复: ${path}`);
    }
    this._map[path] = page;
  }
  /**
   * 全局进入前钩子
   */
  beforeEnter(hook) {
    this._hooks.beforeEnter.push(hook);
  }
  /**
   * 全局离开前钩子
   */
  beforeLeave() {
    this._hooks.beforeLeave.push(hook);
  }
  /**
   * 判断是否存在, 如果存在则返回对应 route
   * @param {*} route
   */
  has(route) {
    const found = this._find(route) > -1;
    if (found > -1) {
      return this._history[found][0];
    } else {
      return false;
    }
  }
  /**
   * go 的工作流程稍微有点复杂
   * 1. 如果在历史中不存在, 就 push
   * 2. 如果是上一个页面, 就 replace
   * 3. 如果是更早的页面, 就在当前页判断一下 beforeLeave, 然后 pop 直到那个页面
   * 所以, 只要能明确使用场景的, 就不要用 go
   * @param {*} page
   * @param {*} data
   */
  go(page, data) {
    const found = this._find(page);
    const len = this._history.length;
    if (found === -1) {
      return this.push(page, data);
    }
    if (found === len - 1) {
      return this.replace(page, data);
    }
    return new Promise((resolve, reject) => {
      this._canIPop().then(() => {
        /** splice 第二个参数不是很准确, 不过不重要, 反正能截掉 */
        const willPopNavs = this._history.splice(found + 1, len - found);
        willPopNavs.forEach(nav => {
          if(nav[0].waiting) {
            // 有在等待的 全部 reject 掉
            nav[0].waiting.reject(`${EXCEPTION.REJECTED_BY_GO} | in ${nav[0].name} `);
          }
        });
        // 路由数据清理
        this._revert(willPopNavs[0][0]._revertIndex);
        // 可能有参数, 所以 put 一下
        this._put(data);
        const top = this._history[this._history.length - 1][0];
        // 处理一下 waiting 如果有的话
        if (top.waiting) {
          // 等了好久终于等到今天
          top.waiting.resolve(data);
        }
        resolve();
      }).catch(reject);
    });
 }

  push(page, data) {
    return new Promise((resolve, reject) => {
      this._id++;
      const route = {
        id: this._id,
        type: page,
      };

      /**
       * 注意 HTML 元素 div/input 也是字符串, 但是我们的页面都是 Page, 所以不做防御
       */
      try {
        if (typeof page === 'string') {
          route.name = this._map[page].name || this._map[page].displayName;
          route.element = React.createElement(
            this._map[page],
            {
              key: this._id,
              ref: (ref) => this._ref(this._id, ref),
              route,
            },
            null);
        } else {
          route.name = page.name || page.displayName;
          route.element = React.createElement(
            page,
            {
              key: this._id,
              ref: (ref) => this._ref(this._id, ref),
              route,
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
      route.route = route;
      const nowNav = this._history[this._history.length - 1];
      const top = nowNav && nowNav[0];
      if (top) {
        top.waiting = {
          resolve,
          reject,
        };
        top.ref.onHide();
      }

      route._revertIndex = this._put(data);
      /**
       * 超大问题!!!! 动画跟这也有关系
       * 应该是先把实例生成了, 然后再判断能不能push
       */
      Promise.all(this._hooks.beforeEnter.map(hook => hook(route)))
        .then(() => {
          this._history.push([route]);
          // event.emit('push', route);
          event.emit(this._history);
        }).catch(reject)
    });
  }

  pop(data) {
    return new Promise((resolve, reject) => {
      if (this._history.length > 1) {
        const prev = this._history[this._history.length - 2][0];
        const top = this._history[this._history.length - 1][0];
        this._canIPop().then(() => {
          if (top.ref) {
            top.ref._animatingLeave(ANIMATE_DURATION);
          }
          wait(ANIMATE_DURATION).then(() => {
            this._history.pop();
            // event.emit('pop', top);
            event.emit(this._history);
            /**
             * 处理路由数据, 这里有点微妙, 需要好好想想并测试
             */
            this._revert(top._revertIndex);
            this._put(data);
            if (prev.waiting) {
              prev.waiting.resolve(data);
              prev.ref.onShow();
            }
            resolve();
          })
        }).catch(reject);
      } else {
        reject(EXCEPTION.NO_MORE_HISTORY);
      }
    })
  }

  replace(page, data) {
    return new Promise((resolve, reject) => {
      this._id++;
      const route = {
        id: this._id,
        type: page,
      };

      /**
       * 注意 HTML 元素 div/input 也是字符串, 但是我们的页面都是 Page, 所以不做防御
       */
      try {
        if (typeof page === 'string') {
          route.name = this._map[page].name || this._map[page].displayName;
          route.element = React.createElement(
            this._map[page],
            {
              key: this._id,
              ref: (ref) => this._ref(this._id, ref),
              route,
            },
            null);
        } else {
          route.name = page.name || page.displayName;
          route.element = React.createElement(
            page,
            {
              key: this._id,
              ref: (ref) => this._ref(this._id, ref),
              route,
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
      route.route = route;
      const top = this._history[this._history.length - 1][0];
      /** 先清理掉之前的数据 */
      this._revert(top._revertIndex);
      if (top.waiting) {
        top.waiting.reject(`${EXCEPTION.REJECTED_BY_REPLACE} | in ${top.name}`);
      }
      /** 再设置新的数据 */
      route._revertIndex = this._put(data);

      this._history[this._history.length - 1] = [route];
      // event.emit('replace', route);
      event.emit(this._history);
      resolve();
    });
  }

  popup(over) {
    this._id++;
    const route = {
      id: this._id,
      name: typeof over === 'string' ? over : over && over.name || over.displayName,
      type: over,
      element: React.createElement(
        over,
        {
          key: this._id,
          route,
        },
        null
      ),
    };

    const topNav = this._history[this._history.length - 1];
    /**
     * 弹窗层的 router, 很显然, 是当前 Page
     */
    route.route = topNav[0];

    topNav.push(route);
    // event.emit('popup', route);
    event.emit(this._history);
  }

  dismiss() {
    const topNav = this._history[this._history.length - 1];
    // 有弹窗的时候才删除, 否则, 不触发
    if (topNav.length > 1) {
      const dismissed = topNav.splice(topNav.length - 1, 1);
      // event.emit('dismiss', dismissed[0]);
      event.emit(this._history);
    }
  }
}

const router = new Router();

/**
 * 处理 app 状态
 */
let appState = 'active';
AppState.addEventListener('change', (state) => {
  const topNav = router._history[router._history.length - 1];
  const top = topNav && topNav[0];
  if (top && top.ref) {
    if (appState.match(/inactive|background/) && state === 'active') {
      // onShow
      top.ref.onShow();
    }
    if (appState === 'active' && state.match(/inactive|background/)) {
      // onHide
      top.ref.onHide();
    }
  }
  appState = state;
});

export default router;
