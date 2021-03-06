import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import styles from './index.scss';

export default class Loading extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    isLoading: PropTypes.bool,
    loaderCls: PropTypes.string
  };

  static defaultProps = {
    isLoading: false
  };

  render() {
    const {
      className, isLoading, children, loaderCls
    } = this.props;

    if (isLoading) {
      return (
        <Fragment>
          <div className={classnames(styles.loading, className)}>
            <div className={styles.loadOuter}>
              <div className={classnames(styles.loader, loaderCls)} />
            </div>
          </div>
        </Fragment>
      );
    }

    return <Fragment>{children}</Fragment>;
  }
}
