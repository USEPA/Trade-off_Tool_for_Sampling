/** @jsxImportSource @emotion/react */

import { Fragment } from 'react';
import { css } from '@emotion/react';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import CharacterizeAOI from 'components/CharacterizeAOI';
import CustomSampleType from 'components/CustomSampleType';
import MessageBox from 'components/MessageBox';
import NavigationButton from 'components/NavigationButton';
import StagingAreas from 'components/StagingAreas';
// types
import { ErrorType } from 'types/Misc';
import { AppType } from 'types/Navigation';

export type SaveStatusType =
  | 'none'
  | 'changes'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'fetch-failure'
  | 'name-not-available';

export type SaveResultsType = {
  status: SaveStatusType;
  error?: ErrorType;
};

// --- styles (Calculate) ---
const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: 20px 0;
`;

const sectionContainer = css`
  margin-bottom: 10px;
  padding: 0 20px;
`;

// --- components (AdditionalTools) ---
type Props = {
  appType: AppType;
};

function AdditionalTools({ appType }: Props) {
  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <h2>Additional Tools</h2>
          {appType === 'sampling' && (
            <p>
              Additional tools are available to support planning efforts. TOTS
              allows user to create custom sample types for use in planning. You
              can also characterize an area of interest (AOI) to understand
              characteristics of ground surfaces and building infrastructure in
              an AOI. Use EPA’s waste staging/storage suitability feature layer
              in conjunction with other relevant GIS data (e.g., parcel
              ownership) to identify staging areas.​
            </p>
          )}
          {appType === 'decon' && (
            <p>
              Additional tools are available to support planning efforts. You
              can characterize an area of interest (AOI) to understand
              characteristics of ground surfaces and building infrastructure in
              an AOI. Use EPA’s waste staging/storage suitability feature layer
              in conjunction with other relevant GIS data (e.g., parcel
              ownership) to identify staging areas.​
            </p>
          )}

          <MessageBox
            severity="warning"
            title=""
            message={
              <Fragment>
                Note: Your work only persists as long as your current browser
                session. Be sure to publish your selections for future reference
                and use.
              </Fragment>
            }
          />
        </div>

        <AccordionList>
          <AccordionItem title={'Characterize Area of Interest'}>
            <div css={sectionContainer}>
              <CharacterizeAOI />
            </div>
          </AccordionItem>
          <AccordionItem title="Identify Staging Areas">
            <div css={sectionContainer}>
              <StagingAreas />
            </div>
          </AccordionItem>
          {appType === 'sampling' && (
            <AccordionItem title="Create Custom Sample Types">
              <div css={sectionContainer}>
                <CustomSampleType
                  appType="sampling"
                  id="plan-custom-sample-types"
                />
              </div>
            </AccordionItem>
          )}
        </AccordionList>
      </div>

      <div css={sectionContainer}>
        <NavigationButton
          currentPanel="additionalTools"
          includeSkipToPublish={true}
        />
      </div>
    </div>
  );
}

export default AdditionalTools;
