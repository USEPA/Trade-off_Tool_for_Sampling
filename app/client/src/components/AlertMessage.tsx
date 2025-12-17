/** @jsxImportSource @emotion/react */

import React, { Fragment } from 'react';
import { css } from '@emotion/react';
// import { globalHistory } from '@reach/router';
// contexts
import { useLookupFiles } from 'contexts/LookupFiles';

const bannerStyles = (color: string, backgroundColor: string) => {
  return css`
    background-color: ${backgroundColor};
    color: ${color};
    width: 100%;
    margin: 0 auto;
    padding: 10px 5px;
    text-align: center;

    p {
      padding: 0;
      margin: 0;
    }
  `;
};

function AlertMessage() {
  const notifications = useLookupFiles().data.notifications;

  if (Object.keys(notifications).length > 0) {
    // create a banner that applies to all pages
    const allPagesBanner = notifications.message && (
      <div
        css={bannerStyles(notifications.color, notifications.backgroundColor)}
        dangerouslySetInnerHTML={{ __html: notifications.message }}
        data-testid="all-pages-notifications-banner"
      ></div>
    );

    return <Fragment>{allPagesBanner}</Fragment>;
  }

  // catch all, including notification status of failure and fetching
  return null;
}

export default AlertMessage;
