import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import AppImages from './AppImages';
import styles from './index.scss';

export default class Rectangle extends PureComponent {
  static propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    apps: PropTypes.array,
    id: PropTypes.string
  };

  render() {
    const { title, description, apps, id } = this.props;
    return (
      <div className={styles.rectangle}>
        <div className={styles.title}>{title}</div>
        <div className={styles.idShow}>{id}</div>
        <div className={styles.description}>{description}</div>
        <AppImages apps={apps} />
      </div>
    );
  }
}