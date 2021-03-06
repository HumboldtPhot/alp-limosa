/* global BROWSER */

import { RouterBuilder, RoutesTranslations } from 'limosa';

export { RouterBuilder } from 'limosa';

export default function alpLimosa(routerBuilder: Function, controllers: Map) {
  return (app) => {
    const config = app.config;
    const routeTranslationsConfig: Map = config.get('routeTranslations');
    const routeTranslations = new RoutesTranslations(routeTranslationsConfig);
    const builder = new RouterBuilder(routeTranslations, config.get('availableLanguages'));
    routerBuilder(builder);
    const router = app.router = builder.router;

    app.context.urlGenerator = function () {
      // eslint-disable-next-line prefer-rest-params
      return router.urlGenerator(this.language, ...arguments);
    };

    app.context.redirectTo = function (to: string, params: ?Object) {
      // eslint-disable-next-line prefer-rest-params
      return this.redirect(router.urlGenerator(this.language, to, params));
    };

    app.controllers = controllers;

    if (!BROWSER) {
      app.registerBrowserContextTransformer((initialBrowserContext, ctx) => (
        initialBrowserContext.route = ctx.route
      ));
    }

    /**
     *
     * @param {string} controllerName
     * @param {string} [actionName]
     * @returns {*}
     */
    app.context.callAction = function (controllerName: string, actionName: ?string) {
      const route = this.route;

      if (!actionName) {
        actionName = controllerName;
        controllerName = route.controller;
      }

      const controller = controllers.get(controllerName);
      if (!controller) {
        this.status = 404;
        throw new Error(`Controller not found: ${controllerName}`);
      }

      const action = controller[actionName];
      if (!action/* || !action.isAction*/) {
        this.status = 404;
        throw new Error(`Action not found: ${route.controller}.${route.action}`);
      }

      try {
        return Promise.resolve(controller[actionName].call(null, this));
      } catch (err) {
        return Promise.reject(err);
      }
    };

    return (ctx) => {
      let route = router.find(ctx.path, ctx.language);

      if (!route) {
        ctx.status = 404;
        throw new Error(`Route not found: ${ctx.path}`);
      }

      ctx.route = route;

      return ctx.callAction(route.controller, route.action);
    };
  };
}
