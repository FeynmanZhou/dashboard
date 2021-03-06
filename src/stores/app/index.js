import { observable, action } from 'mobx';
import _, { get, assign } from 'lodash';

import { useTableActions } from 'mixins';
import { getProgress, getCookie, sleep } from 'utils';
import { formCheck, fieldCheck } from 'config/form-check';

import Store from '../Store';

const maxsize = 2 * 1024 * 1024;
let sequence = 0; // app screenshot for sort

@useTableActions
class AppStore extends Store {
  idKey = 'app_id';

  sortKey = 'status_time';

  defaultStatus = ['draft', 'active', 'suspended'];

  @observable apps = [];

  @observable homeApps = [];

  // menu apps
  @observable menuApps = [];

  // judje query menu apps
  @observable hasMeunApps = false;

  @observable
  appDetail = {
    name: '',
    abstraction: '',
    description: '',
    category_id: '',
    home: '',
    readme: '',
    tos: '',
    icon: '',
    screenshots: ''
  };

  @observable summaryInfo = {};

  // replace original statistic
  @observable categoryTitle = '';

  @observable appId = '';

  // current app_id
  @observable isLoading = false;

  @observable isProgressive = false;

  @observable appCount = 0;

  @observable repoId = '';

  @observable categoryId = '';

  @observable userId = '';

  @observable isModalOpen = false;

  @observable isDeleteOpen = false;

  @observable operateType = '';

  @observable appTitle = '';

  @observable detailTab = '';

  @observable currentPic = 1;

  @observable viewType = 'list';

  @observable createStep = 1;

  @observable createReopId = '';

  @observable uploadFile = '';

  @observable createError = '';

  @observable createResult = null;

  @observable hasMore = false;

  isEdit = true;

  resetAppDetail = {};

  @observable iconShow = '';

  // menu actions logic
  @observable
  handleApp = {
    action: '', // delete, modify
    selectedCategory: '' // category id
  };

  @observable unCategoriedApps = [];

  @observable countStoreApps = 0;

  @observable showActiveApps = false;

  @observable checkResult = {};

  get clusterStore() {
    return this.getStore('cluster');
  }

  @action
  fetchStoreAppsCount = async () => {
    const res = await this.request.get('active_apps', {
      display_columns: [''],
      status: 'active'
    });

    this.countStoreApps = _.get(res, 'total_count', 0);
  };

  @action
  fetchMenuApps = async () => {
    const userId = getCookie('user_id');
    const menuApps = localStorage.getItem(`${userId}-apps`);

    if (!menuApps) {
      const params = {
        sort_key: 'status_time',
        limit: 5,
        status: this.defaultStatus
      };
      const result = await this.request.get('apps', params);

      this.menuApps = get(result, 'app_set', []);
      localStorage.setItem(`${userId}-apps`, JSON.stringify(this.menuApps));
    } else {
      this.menuApps = JSON.parse(menuApps);
    }
  };

  @action
  fetchMeunApp = async (appId, isFetch) => {
    const userId = getCookie('user_id');
    const menuApps = localStorage.getItem(`${userId}-apps`);
    const apps = JSON.parse(menuApps || '[]');
    const appDetail = _.find(apps, { app_id: appId });

    if (appDetail && !isFetch) {
      this.appDetail = appDetail;
      // modify info will change app info
      this.resetAppDetail = appDetail;
    } else {
      await this.fetch(appId);

      // if can't get app, should not storage app info
      if (!this.appDetail.app_id) {
        return;
      }

      if (appDetail) {
        const index = _.findIndex(apps, { app_id: appId });
        apps.splice(index, 1, this.appDetail);
      } else {
        apps.unshift(this.appDetail);
        apps.splice(5, 1);
      }

      localStorage.setItem(`${userId}-apps`, JSON.stringify(apps));
      this.menuApps = apps;
    }
  };

  @action
  fetchActiveApps = async (params = {}) => {
    await this.fetchAll(Object.assign(params, { action: 'active_apps' }));
  };

  @action
  fetchAll = async (params = {}) => {
    // dont mutate observables, just return results
    const noMutate = Boolean(params.noMutate);
    const fetchAction = params.action || 'apps';

    params = this.normalizeParams(_.omit(params, ['noMutate', 'action']));

    if (params.app_id) {
      delete params.status;
    }

    if (this.searchWord) {
      params.search_word = this.searchWord;
    }

    if (this.categoryId && !params.category_id) {
      params.category_id = this.categoryId;
    }

    // filter empty cate
    if (!params.category_id) {
      delete params.category_id;
    }

    if (this.repoId) {
      params.repo_id = this.repoId;
    }
    if (this.userId) {
      params.owner = this.userId;
    }

    if (!params.noLoading) {
      this.isLoading = true;
    } else {
      this.isProgressive = true;
      delete params.noLoading;
    }

    const result = await this.request.get(fetchAction, params);
    const apps = get(result, 'app_set', []);
    const totalCount = get(result, 'total_count', 0);

    this.hasMore = totalCount > apps.length;

    if (noMutate) {
      this.isLoading = false;
      return {
        apps,
        totalCount
      };
    }

    if (params.loadMore) {
      this.apps = _.concat(this.apps.slice(), apps);
    } else {
      this.apps = apps;
    }

    this.totalCount = totalCount;

    // appCount for show repo datail page "App Count"
    if (!this.searchWord && !this.selectStatus) {
      this.appCount = this.totalCount;
    }

    // query app deploy times
    if (this.attchDeployTotal && apps.length > 0) {
      const clusterStore = this.clusterStore;
      this.apps = [];
      await apps.forEach(async app => {
        await clusterStore.fetchAll({
          app_id: app.app_id,
          display_columns: ['']
        });
        this.apps.push(
          _.assign(app, { deploy_total: clusterStore.totalCount })
        );
      });
    }

    this.isLoading = false;
    this.isProgressive = false;
  };

  @action
  fetchStatistics = async () => {
    this.isLoading = true;
    const result = await this.request.get('apps/statistics');
    this.summaryInfo = {
      name: 'Apps',
      iconName: 'appcenter',
      centerName: 'Repos',
      total: get(result, 'app_count', 0),
      progressTotal: get(result, 'repo_count', 0),
      progress: get(result, 'top_ten_repos', {}),
      histograms: get(result, 'last_two_week_created', {}),
      topRepos: getProgress(get(result, 'top_ten_repos', {})), // top repos
      appCount: get(result, 'app_count', 0),
      repoCount: get(result, 'repo_count', 0)
    };
    this.isLoading = false;
  };

  @action
  fetch = async (appId = '') => {
    this.isLoading = true;
    const result = await this.request.get(`apps`, {
      app_id: appId,
      isGlobalQuery: true
    });
    const appDetail = get(result, 'app_set[0]', {});
    this.appDetail = _.assign(appDetail, {
      category_id: get(appDetail, 'category_set[0].category_id', '')
    });
    // set this variable for reset app info
    this.resetAppDetail = { ...this.appDetail };
    this.isLoading = false;
  };

  @action
  createOrModify = async (params = {}) => {
    const defaultParams = {
      repo_id: this.createReopId,
      package: this.uploadFile
    };

    if (this.createAppId) {
      defaultParams.app_id = this.createAppId;
      await this.modify(assign(defaultParams, params));
    } else {
      defaultParams.status = 'draft';
      await this.create(assign(defaultParams, params));
    }

    if (get(this.createResult, 'app_id')) {
      this.createAppId = get(this.createResult, 'app_id');
      this.createStep = 3; // show application has been created page
    } else {
      const { err, errDetail } = this.createResult;
      this.createError = errDetail || err;
    }
  };

  @action
  create = async (params = {}) => {
    this.isLoading = true;
    this.createResult = await this.request.post('apps', params);
    this.isLoading = false;
  };

  @action
  modify = async (params = {}, hasNote) => {
    this.isLoading = true;
    this.createResult = await this.request.patch('apps', params);
    this.isLoading = false;

    if (hasNote && get(this.createResult, 'app_id')) {
      this.info('Save successful');
    }
  };

  @action
  modifyApp = async event => {
    let isActionSuccess = false;

    if (event) {
      event.preventDefault();
    }

    const data = _.pick(this.appDetail, [
      'name',
      'abstraction',
      'description',
      'home',
      'icon'
    ]);

    this.checkResult = _.assign({}, formCheck('app', data));

    if (_.isEmpty(this.checkResult)) {
      await this.modify(
        _.assign(data, {
          app_id: this.appDetail.app_id,
          category_id: this.appDetail.category_id,
          icon: this.appDetail.icon
        }),
        Boolean(event)
      );

      // update the meun app show
      if (get(this.createResult, 'app_id')) {
        isActionSuccess = true;
        this.fetchMeunApp(this.appDetail.app_id, true);
      }
    }

    return isActionSuccess;
  };

  @action
  changeApp = (event, type) => {
    this.appDetail[type] = event.target.value;
  };

  @action
  checkApp = async (event, field, isFocus) => {
    if (isFocus) {
      this.checkResult = _.assign(this.checkResult, { [field]: '' });
    } else {
      this.checkResult = _.assign(
        this.checkResult,
        fieldCheck('app', field, event.target.value)
      );
    }
  };

  @action
  changeCategory = value => {
    this.appDetail.category_id = value;
  };

  @action
  saveAppInfo = async type => {
    await this.modify(
      {
        app_id: this.appDetail.app_id,
        [type]: this.appDetail[type]
      },
      true
    );
  };

  @action
  attachment = async (params = {}) => {
    await this.request.patch('app/attachment', params);
  };

  @action
  checkIcon = file => {
    if (!/\.(png)$/.test(file.name.toLocaleLowerCase())) {
      this.error('icon_format_note');
      return false;
    }

    if (file.size > maxsize) {
      this.error('The file size cannot exceed 2M');
      return false;
    }

    return true;
  };

  @action
  uploadIcon = async base64Str => {
    const result = await this.attachment({
      app_id: this.appDetail.app_id,
      type: 'icon',
      attachment_content: base64Str
    });

    if (result && result.err) {
      return false;
    }

    this.appDetail.icon = base64Str;
  };

  @action
  deleteIcon = () => {
    this.appDetail.icon = '';
  };

  @action
  checkScreenshot = file => {
    if (!/\.(png|jpg)$/.test(file.name.toLocaleLowerCase())) {
      this.error('screenshot_format_note');
      return false;
    }

    if (file.size > maxsize) {
      this.error('The file size cannot exceed 2M');
      return false;
    }

    return true;
  };

  @action
  uploadScreenshot = async base64Str => {
    const screenshotStr = _.get(this.appDetail, 'screenshots', '');
    const screenshots = screenshotStr ? screenshotStr.split(',') : [];
    sequence = screenshots.length - 1;
    sequence++;

    if (sequence >= 6) {
      return this.error('MAX_UPLOAD_SCREENSHOTS');
    }

    this.appDetail.screenshots = sequence === 0 ? base64Str : `${screenshotStr},${base64Str}`;

    const result = await this.attachment({
      app_id: this.appDetail.app_id,
      type: 'screenshot',
      attachment_content: base64Str,
      sequence
    });
    await sleep(sequence * 200);

    if (result && result.err) {
      sequence--;
      return false;
    }
  };

  @action
  deleteScreenshot = async () => {
    const screenshotStr = _.get(this.appDetail, 'screenshots', '');
    const screenshots = screenshotStr ? screenshotStr.split(',') : [];

    this.appDetail.screenshots = '';
    for (let i = 0; i < screenshots.length; i++) {
      await this.attachment({
        app_id: this.appDetail.app_id,
        type: 'screenshot',
        attachment_content: '',
        sequence: 0
      });
      await sleep(200);
    }
  };

  @action
  remove = async () => {
    this.appId = this.appId ? this.appId : this.appDetail.app_id;
    const ids = this.operateType === 'multiple' ? this.selectIds.toJSON() : [this.appId];

    const result = await this.request.delete('apps', { app_id: ids });

    if (get(result, 'app_id')) {
      if (this.operateType !== 'detailDelete') {
        await this.fetchAll();
        this.cancelSelected();
        this.hideModal();
      }
      this.success('Delete app successfully');
    } else {
      return result;
    }
  };

  @action
  changeAppCate = value => {
    this.handleApp.selectedCategory = value;
  };

  @action
  modifyCategoryById = async () => {
    if (!this.handleApp.selectedCategory) {
      this.info('Please select a category');
      return;
    }
    const result = await this.modify({
      category_id: this.handleApp.selectedCategory,
      app_id: this.appId
    });
    this.hideModal();

    if (!result.err) {
      this.success('Modify category successfully');
      await this.fetchAll();
    }
  };

  @action
  hideModal = () => {
    this.isDeleteOpen = false;
    this.isModalOpen = false;
  };

  @action
  showDeleteApp = ids => {
    if (typeof ids === 'string') {
      this.appId = ids;
      this.operateType = 'single';
    } else {
      this.operateType = 'multiple';
    }
    this.isDeleteOpen = true;
  };

  @action
  showModifyAppCate = (app_id, category_set = []) => {
    this.appId = app_id;
    if ('toJSON' in category_set) {
      category_set = category_set.toJSON();
    }
    const availableCate = category_set.find(
      cate => cate.category_id && cate.status === 'enabled'
    );
    this.handleApp.selectedCategory = get(availableCate, 'category_id', '');
    this.isModalOpen = true;
  };

  reset = () => {
    this.categoryId = '';
    this.repoId = '';
    this.userId = '';

    this.apps = [];
    this.appDetail = {};
    this.showActiveApps = false;
    this.checkResult = {};

    this.resetTableParams();
  };

  @action
  loadMore = async page => {
    this.currentPage = page;
    const fetchAction = this.showActiveApps ? 'fetchActiveApps' : 'fetchAll';
    await this[fetchAction]({ loadMore: true });
  };

  @action
  resetBaseInfo = () => {
    _.assign(this.appDetail, this.resetAppDetail);
  };

  @action
  setCreateStep = step => {
    this.createStep = step;
  };

  @action
  changePicture = (type, number, pictures) => {
    const len = pictures.length;
    if (type === 'dot') {
      this.currentPic = 2 * number + 1;
    }
    if (type === 'pre' && this.currentPic > 2) {
      this.currentPic -= 2;
    }
    if (type === 'next' && this.currentPic + 1 < len) {
      this.currentPic += 2;
    }
  };
}

export default AppStore;

export Deploy from './deploy';
export Version from './version';
export Create from './create';
export Uncategoried from './uncategoried';
