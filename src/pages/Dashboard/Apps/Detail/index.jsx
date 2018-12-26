import React, { Component, Fragment } from 'react';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import { translate } from 'react-i18next';
import _ from 'lodash';
import classNames from 'classnames';

import {
  Icon, Input, Table, Button, Image
} from 'components/Base';
import Layout, { Grid, Section, Card } from 'components/Layout';
import DetailTabs from 'components/DetailTabs';
import Status from 'components/Status';
import TdName from 'components/TdName';
import TimeShow from 'components/TimeShow';
import AppStatistics from 'components/AppStatistics';
import versionTypes from 'config/version-types';
import Versions from '../../Versions';

import styles from './index.scss';

const tags = [
  { name: '用户实例', value: 'instance' },
  { name: '线上版本', value: 'online' },
  { name: '审核记录', value: 'record' }
];
@translate()
@inject(({ rootStore }) => ({
  rootStore,
  appStore: rootStore.appStore,
  appVersionStore: rootStore.appVersionStore,
  clusterStore: rootStore.clusterStore,
  userStore: rootStore.userStore,
  user: rootStore.user
}))
@observer
export default class AppDetail extends Component {
  async componentDidMount() {
    const {
      appStore, appVersionStore, clusterStore, match
    } = this.props;
    const { appId } = match.params;

    await appStore.fetch(appId);

    clusterStore.appId = appId;
    await clusterStore.fetchAll({ app_id: appId });

    await appVersionStore.fetchAll({ app_id: appId, noLimit: true });
  }

  changeTab = async tab => {
    const { appStore, appVersionStore, match } = this.props;

    if (tab !== appStore.detailTab) {
      appStore.detailTab = tab;

      if (tab === 'online') {
        const { appId } = match.params;
        await appVersionStore.fetchTypeVersions(appId);
      } else if (tab === 'record') {
        const { appDetail } = appStore;
        const versoinId = _.get(appDetail, 'latest_app_version.version_id', '');
        await appVersionStore.fetchAudits(appDetail.app_id, versoinId);
      }
    }
  };

  renderVersionName = version_id => {
    const { appVersionStore } = this.props;
    const { versions } = appVersionStore;
    const version = _.find(versions, { version_id }) || {};
    const typeName = (_.find(versionTypes, { value: version.type }) || {}).name;

    return (
      <div className={styles.versionName}>
        <label className={styles.type}>{typeName}</label>
        {version.name}
      </div>
    );
  };

  renderRecord() {
    const {
      appVersionStore, appStore, userStore, t
    } = this.props;
    const { appDetail } = appStore;
    const { users } = userStore;
    const { audits } = appVersionStore;
    const versoinId = _.get(appDetail, 'latest_app_version.version_id', '');
    const records = audits[versoinId] || [];

    const columns = [
      {
        title: t('申请编号'),
        key: 'number',
        width: '120px',
        render: item => item.version_id
      },
      {
        title: t('申请类型'),
        key: 'type',
        width: '60px',
        render: item => item.type
      },
      {
        title: t('Status'),
        key: 'status',
        width: '80px',
        render: cl => (
          <Status type={cl.status} transition={cl.transition_status} />
        )
      },
      {
        title: t('Update time'),
        key: 'status_time',
        width: '100px',
        render: item => item.status_time
      },
      {
        title: t('审核人员'),
        key: 'operator',
        width: '80px',
        render: item => item.operator
      }
    ];

    // todo
    const pagination = {
      tableType: 'Clusters',
      total: records.length,
      current: 1
    };

    return (
      <Card>
        <Table columns={columns} dataSource={records} pagination={pagination} />
      </Card>
    );
  }

  renderInstance() {
    const {
      clusterStore, appStore, userStore, t
    } = this.props;
    const {
      clusters, onSearch, onClearSearch, searchWord
    } = clusterStore;
    const { users } = userStore;

    const columns = [
      {
        title: t('Status'),
        key: 'status',
        width: '100px',
        render: item => (
          <Status type={item.status} transition={item.transition_status} />
        )
      },
      {
        title: t('Instance Name ID'),
        key: 'name',
        width: '155px',
        render: item => (
          <TdName name={item.name} description={item.cluster_id} noIcon />
        )
      },
      {
        title: t('Version'),
        key: 'app_id',
        width: '150px',
        render: item => this.renderVersionName(item.version_id)
      },
      {
        title: t('Node Count'),
        key: 'node_count',
        width: '80px',
        render: item => (item.cluster_node_set && item.cluster_node_set.length) || 0
      },
      {
        title: t('Created At'),
        key: 'create_time',
        width: '80px',
        render: item => <TimeShow time={item.create_time} />
      }
    ];

    const pagination = {
      tableType: 'Clusters',
      onChange: clusterStore.changePagination,
      total: clusterStore.totalCount,
      current: clusterStore.currentPage,
      noCancel: false
    };

    return (
      <Card>
        <div className={styles.searchOuter}>
          <p className={styles.total}>
            已部署 {clusterStore.totalCount} 个应用实例
          </p>
          <Input.Search
            className={styles.search}
            placeholder={t('搜索或过滤')}
            value={searchWord}
            onSearch={onSearch}
            onClear={onClearSearch}
          />
        </div>
        <Table
          columns={columns}
          dataSource={clusters.toJSON()}
          pagination={pagination}
        />
      </Card>
    );
  }

  renderAppBase() {
    const { appStore, t } = this.props;
    const { appDetail } = appStore;
    const categories = _.get(appDetail, 'category_set', []);

    return (
      <Card className={styles.appBase}>
        <div className={styles.title}>
          <span className={styles.image}>
            <Image
              src={appDetail.icon}
              iconLetter={appDetail.name}
              iconSize={48}
            />
          </span>
          <span className={styles.appName}>{appDetail.name}</span>
        </div>
        <div className={styles.info}>
          <dl>
            <dt>{t('应用编号')}</dt>
            <dd>{appDetail.app_id}</dd>
          </dl>
          <dl>
            <dt>{t('交付类型')}</dt>
            <dd>{appDetail.app_version_types}</dd>
          </dl>
          <dl>
            <dt>{t('应用介绍')}</dt>
            <dd>{appDetail.abstraction}</dd>
          </dl>
          <dl>
            <dt>{t('分类')}</dt>
            <dd>
              {categories.map(item => (
                <label key={item.category_id}>{item.name}</label>
              ))}
            </dd>
          </dl>
          <dl>
            <dt>{t('开发者')}</dt>
            <dd>{appDetail.owner}</dd>
          </dl>
          <dl>
            <dt>{t('上架时间')}</dt>
            <dd>{appDetail.status_time}</dd>
          </dl>
          <Link to="/" className={styles.link}>
            {t('去商店中查看')} →
          </Link>
        </div>
      </Card>
    );
  }

  render() {
    const { appVersionStore, appStore, t } = this.props;
    const { detailTab } = appStore;
    const { versions } = appVersionStore;

    return (
      <Layout pageTitle={t('应用详情')} hasBack>
        <Grid>
          <Section size={4}>{this.renderAppBase()}</Section>
          <Section size={8}>
            <AppStatistics isAppDetail appTotal={versions.length} />
            <DetailTabs tabs={tags} changeTab={this.changeTab} />
            {detailTab === 'instance' && this.renderInstance()}
            {detailTab === 'online' && <Versions />}
            {detailTab === 'record' && this.renderRecord()}
          </Section>
        </Grid>
      </Layout>
    );
  }
}
