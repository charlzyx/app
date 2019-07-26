import React from 'react';
import { AppState, BackHandler } from 'react-native';
import produce, { applyPatches } from 'immer';


/**
 * 路由能出来的所有异常
 */
const EXCEPTION = {
  NO_MORE_HISTORY: '历史记录长度小于1',
  REJECTED_BY_GO: '被 go 直接splice掉了',
  REJECTED_BY_REPLACE: '被 replace 掉了',
  BEFORE_LEAVE_RETURN_NO_PROMISE: '页面中 beforeLeave 钩子的返回值不是 Promise, 期望: (route) => Promise<any>',
  BEFORE_ENTER_RETURN_NO_PROMISE: '页面中 beforeEnter 钩子的返回值不是 Promise, 期望: (route) => Promise<any>',
  MUTIPLE_ROUTE_PATH: '静态路由表存在重复 path',
  WAITING_NEXT_REF_TIME_OUT: '等待页面挂载(ref)超时(500ms)',
  PAGE_NOT_FOUND: '未注册的页面'
};

const wait = (time) => new Promise(resolve => {
  setTimeout(resolve, time);
});

/**
 * core / 路由
 */
class Router {
  /** 自增id, 多好啊, 不用造 hash */
  _id = 1;
  /** 监听事件自增id */
  _listenId = 1;
  /** 监听者们 */
  _listeners = {};
  /** 注册监听 */
  listen(fn) {
    this._listenId++;
    this._listeners[this._listenId] = fn;
    return this._listenId;
  }
  /** 注销监听 */
  unlisten(id) {
    delete this._listeners[id];
  }
  /** 触发路由变更监听函数 */
  _emit(history) {
    Object.keys(this._listeners).forEach(id => {
      this._listeners[id](history);
    });
  }
  /**
   * 全局钩子
   *   Enter
   *   Leave
   */
  _hooks = {
    beforeEnter: [],
    beforeLeave: [],
  };

  /** 注册全局进入前钩子 */
  beforeEnter(hook) {
    this._hooks.beforeEnter.push(hook);
  }
  /** 注册全局离开前钩子 */
  beforeLeave(hook) {
    this._hooks.beforeLeave.push(hook);
  }
  /** 静态路由表 */
  _map = {};
  /** 注册静态路由表 */
  registry(path, page) {
    if (this._map[path]) {
      throw new Error(`${EXCEPTION.MUTIPLE_ROUTE_PATH}|${path}`);
    }
    this._map[path] = page;
  }
  /** 路由数据, 一次性 */
  db = {};
  /** 缓存到路由链路上的数据 */
  keep = {};
  /**
   * 数据操作记录; 反向 patches, 感谢 immer
   * [https://github.com/immerjs/immer#patches](https://github.com/immerjs/immer#patches)
   */
  _inverses = [];
  /** 追加路由数据 */
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
  /** 自动清理路由数据 */
  _revert(revertIndex) {
    if (revertIndex > -1) {
      const patchs = this._inverses.splice(revertIndex, this._inverses.length - revertIndex);
      this.db = applyPatches(this.db, patchs)
    }
  }
  /** 历史栈, 核心数据 */
  _history = [];
  /** 离开动画时长 */
  animateDuration = 233;
  /** 实例Map, 方便一些操作 */
  _refMap = {};
  /** 挂载实例, 用来触发 onShow, onHide 钩子用 */
  _ref(id, ref) {
    let page = null;
    this._history.forEach(nav => {
      if (nav[0].id === id) {
        page = nav[0];
      }
    });
    if (page) {
      page.ref = ref;
      this._refMap[id] = ref;
    }
    // 会没有吗? 会的, pop 的时候会触发 pop 掉的 ref, 暂时还不知道为什么
  }
  /** 查找页面所在 Nav 索引位置 */
  _findNavIndex(page) {
    const navIndex = this._history.findIndex(nav => nav[0].type === page || nav[0].type === this._map[page]);
    return navIndex;
  }
  /** 等待给定id 挂载完毕 */
  _waitingRef(id, begin = +new Date()) {
    return new Promise((resolve, reject) => {
      if (this._refMap[id]) {
        resolve(this._refMap[id]);
      } else if (+new Date() - begin > 500) {
        const nav = this._history.find(nav => nav[0].id === id);
        reject(`${EXCEPTION.WAITING_NEXT_REF_TIME_OUT} at: ${nav[0].name}`);
      } else {
        wait(64).then(() => {
          this._waitingRef(id, begin).then(resolve).catch(reject);
        });
      }
    });
  }
  /** 判断当前栈顶页面能否返回 */
  _canLeave() {
    const top = this._history[this._history.length - 1][0];
    const ref = top.ref;
    const canI = ref.beforeLeave(top);
    if (canI && typeof canI.then !== 'function') {
      reject(`${EXCEPTION.BEFORE_LEAVE_RETURN_NO_PROMISE} at: ${top.name}`);
    } else {
      const hooks = this._hooks.beforeLeave.map(hook => hook(top)).concat(canI);
      return Promise.all(hooks);
    }
  }
  /** 判断是否存在, 如果存在则返回对应 route */
  has(route) {
    const found = this._findNavIndex(route) > -1;
    if (found > -1) {
      return this._history[found][0];
    } else {
      return false;
    }
  }
  parser(uri) {

  }
  _unacross = [];
  across(paths) {

  }
  /** 新增一个页面, push到历史栈顶 */
  push(page, data) {
    return new Promise((resolve, reject) => {
      /**
       * 存一下当前栈顶页面
       */
      const topNav = this._history[this._history.length - 1];
      const top = topNav && topNav[0];
      /** id 自增 */
      this._id++;
      const type = this._map[page] || page;
      if (!type) {
        reject(`${EXCEPTION.PAGE_NOT_FOUND} ${page}`)
      }
      /**
       * 关联 id 和 type,
       * 需要注意的是: ref 则是在页面挂载之后才会有
       */
      const name = typeof page === 'string' ? page : (type.name || type.displayName || type.toString());
      const route = {
        id: this._id,
        type,
        path: `${name}.${this._id}`,
        action: 'push',
        ref: null,
        name,
        element: null
      };

      /** 生成 element, 添加 name */
      try {
        route.element = React.createElement(
          type,
          {
            key: this._id,
            ref: (ref) => this._ref(this._id, ref),
            route,
          },
          null);
      } catch (e) {
        reject(e);
        throw e;
      }

      /**
       * 先直接 push, 反正也可见(通过初始 transform 来控制)
       */
      this._history.push([route]);
      this._emit(this._history)

     /**
       * 等待页面刷新挂载完成, 0 不太靠谱, 此处应有 loop
       */
      this._waitingRef(route.id).then((nextRef) => {
        /**
         * 钩子走起来
         */
        const canI = nextRef.beforeEnter(route);
        if (canI && typeof canI.then !== 'function') {
          reject(`${EXCEPTION.BEFORE_ENTER_RETURN_NO_PROMISE} at: ${route.name}`);
        }
        const enterHooks = this._hooks.beforeEnter.map(hook => hook(route)).concat(canI);
        Promise.all(enterHooks).then((wtf) => {
           /**
            * 触发当前页面的 onHide
            */
           if (top) {
              top.ref.onHide();
              /**
               * 存储当前页面的  revertIndex
               */
              top._revertIndex = this._put(data);
            }
            /** 触发新页面 Show */
            nextRef.onShow();
            /** 触发新页面的入场动画  */
            nextRef._animatingEnter();
           /** well done! */
            resolve();
          }).catch((e) => {
            /**
             * 钩子不给过, 就撤销push操作就行了
             */
            this._history.pop();
            this._emit(this._history);
            reject(e);
          })
      }).catch(reject);
    });
  }

  /** 新增一个页面, push到历史栈顶, 并等待页面返回值 */
  wait(page, data) {
    return new Promise((resolve, reject) => {
      /**
       * 存一下当前栈顶页面
       */
      const topNav = this._history[this._history.length - 1];
      const top = topNav && topNav[0];
      /** id 自增 */
      this._id++;
      const type = this._map[page] || page;
      if (!type) {
        reject(`${EXCEPTION.PAGE_NOT_FOUND} ${page}`)
      }
      /**
       * 关联 id 和 type,
       * 需要注意的是: ref 则是在页面挂载之后才会有
       */
      const name = typeof page === 'string' ? page : (type.name || type.displayName || type.toString());
      const route = {
        id: this._id,
        type,
        path: `${name}.${this._id}`,
        action: 'wait',
        ref: null,
        name,
        element: null
      };

      /** 生成 element, 添加 name */
      try {
        route.element = React.createElement(
          type,
          {
            key: this._id,
            ref: (ref) => this._ref(this._id, ref),
            route,
          },
          null);
      } catch (e) {
        reject(e);
        throw e;
      }

      /**
       * 先直接 push, 反正也可见(通过初始 transform 来控制)
       */
      this._history.push([route]);
      this._emit(this._history)

      /**
        * 等待页面刷新挂载完成, 0 不太靠谱, 此处应有 loop
        */
      this._waitingRef(route.id).then((nextRef) => {
        /**
         * 钩子走起来
         */
        const canI = nextRef.beforeEnter(route);
        if (canI && typeof canI.then !== 'function') {
          reject(`${EXCEPTION.BEFORE_ENTER_RETURN_NO_PROMISE} at: ${route.name}`);
        }
        const enterHooks = this._hooks.beforeEnter.map(hook => hook(route)).concat(canI);
        Promise.all(enterHooks).then((wtf) => {
          /**
           * 触发当前页面的 onHide
           */
          if (top) {
            top.waiting = {
              resolve,
              reject,
            };
            top.ref.onHide();
            /**
             * 存储当前页面的  revertIndex
             */
            top._revertIndex = this._put(data);
          }
          /** 触发新页面 Show */
          nextRef.onShow();
          /** 触发新页面的入场动画  */
          nextRef._animatingEnter();
        }).catch((e) => {
          /**
           * 钩子不给过, 就撤销push操作就行了
           */
          this._history.pop();
          this._emit(this._history);
          reject(e);
        })
      }).catch(reject);
    });
  }

  /** 弹出当前栈顶元素 */
  pop(data) {
    return new Promise((resolve, reject) => {
      if (this._history.length > 1) {
        const prev = this._history[this._history.length - 2][0];
        const top = this._history[this._history.length - 1][0];
        this._canLeave().then(() => {
          if (top.ref) {
            /** 触发当前页面离开动画 */
            top.ref._animatingLeave();
            /** 触发当前页面 Hide 钩子 */
            top.ref.onHide();
          }

          /** 等待动画完成 */
          wait(this.animateDuration).then(() => {
            /** 先处理数据 */
            this._revert(top._revertIndex);
            this._put(data);
            /** 操作路由栈 */
            this._history.pop();
            this._emit(this._history);
            /** 处理 promise */
            if (prev.waiting) prev.waiting.resolve(data);
            prev.ref.onShow();
            resolve();
          });
        }).catch(reject);
      } else {
        reject(EXCEPTION.NO_MORE_HISTORY);
      }
    })
  }

  /** 直接替换当前栈顶页面 */
  replace(page, data) {
    return new Promise((resolve, reject) => {
      this._id++;

      const type = this._map[page] || page;
      if (!type) {
        reject(`${EXCEPTION.PAGE_NOT_FOUND} ${page}`)
      }
      /**
       * 关联 id 和 type,
       * 需要注意的是: ref 则是在页面挂载之后才会有
       */
      const name = typeof page === 'string' ? page : (type.name || type.displayName || type.toString());
      const route = {
        id: this._id,
        type,
        path: `${name}.${this._id}`,
        action: 'push',
        ref: null,
        name,
        element: null
      };

      /** 生成 element, 添加 name */
      try {
        route.element = React.createElement(
          type,
          {
            key: this._id,
            ref: (ref) => this._ref(this._id, ref),
            route,
          },
          null);
      } catch (e) {
        reject(e);
        throw e;
      }

      const top = this._history[this._history.length - 1][0];
     /** reject 掉top页面push的 promise */
      if (top.waiting) top.waiting.reject(`${EXCEPTION.REJECTED_BY_REPLACE} | in ${top.name}`);
      /** 触发 onHide 钩子 */
      top.ref.onHide();

      /** 先清理掉之前的数据 */
      this._revert(top._revertIndex);
      /** 再设置新的数据 */
      route._revertIndex = this._put(data);

      /** 替换路由 */
      this._history[this._history.length - 1] = [route];
      this._emit(this._history);

      /** 等待挂载完成 */
      this._waitingRef(route.id).then((nextRef) => {
        /** 触发新页面 Show */
        nextRef.onShow();
        /** 触发新页面的入场动画  */
        nextRef._animatingEnter();
        resolve();
      }).catch(reject);
    });
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
    const found = this._findNavIndex(page);
    const len = this._history.length;
    if (found === -1) {
      return this.push(page, data);
    }
    if (found === len - 1) {
      return this.replace(page, data);
    }
    return new Promise((resolve, reject) => {
      const topNav = this._history[len - 1];
      const top = topNav[0];
      this._canLeave().then(() => {
        // 执行 top 离开动画
        top.ref._animatingLeave();
        top.ref.onHide();
        /** 顶层页面不进行删除, 但是无情的删掉中间所有页面 */
        /** 触发成吨的动画, 不知道有没有性能问题? 果然啊, 有问题, 所以现在是只对最顶层做动画 */
        const willPopNavs = this._history.splice(found + 1, len - (found + 1 + 1));
        willPopNavs.forEach(nav => {
          const now = nav[0];
          // 有在等待的 全部 reject 掉, 并触发onHide
          if (now.waiting) now.waiting.reject(`${EXCEPTION.REJECTED_BY_GO} | in ${nav[0].name} `);
          now.ref.onHide();
        });
        // 路由数据清理
        this._revert(willPopNavs[0][0]._revertIndex);
        this._emit(this._history);

        /** 等待动画完成 */
        wait(this.animateDuration).then(() => {
          // 移除动画的那个页面
          this._history.pop();
          // 可能有参数, 所以 put 一下
          this._put(data);
          const next = this._history[this._history.length - 1][0];
          next.action = 'go';
          // 等了好久终于等到今天
          if (next.waiting) next.waiting.resolve(data);
          // 触发这个页面的 onShow
          next.ref.onShow();
          this._emit(this._history);
          resolve();
        });
      }).catch(reject);
    });
  }
  /** 在当前页面弹出弹层, 不会产生页面记录, 但也会触发 history 变更 */
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
    this._emit(this._history);
  }

  /** 取消当前最顶层弹出层 */
  dismiss() {
    const topNav = this._history[this._history.length - 1];
    // 有弹窗的时候才删除, 否则, 不触发
    if (topNav.length > 1) {
      topNav.pop();
      this._emit(this._history);
      return true;
    }
    return false;
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
/**
 * 处理返回键
 */

BackHandler.addEventListener('hardwareBackPress', () => {
  const len = router._history.length;
  // 有弹窗的话, 优先 dismiss 弹窗
  if (len > 1) {
    if(router.dismiss() === false) {
      router.pop();
    }
    return true;
  } else {
    // 如果只剩下一个就尝试取消弹窗, 没有弹窗就原生应用
    return router.dismiss();
  }
});

export default router;
