import config from './index.config';

import routerConfig from './index.route';

import runBlock from './index.run';
import AppConstants from './index.constants';

import BrowseController from './locations/browse/browse.controller';
import HelpController from './locations/help/help.controller';
import './services/services.module';

const requires = [
    'ionic',
    'ui.router',
    'ngMaterial',
    'app.services'
];

angular.module('app', requires)
  .constant("AppConstants", AppConstants)

  .config(config)

  .config(routerConfig)

  .run(runBlock)

  .controller('BrowseController', BrowseController)
  .controller('HelpController', HelpController);
