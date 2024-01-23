/** @jsxImportSource @emotion/react */

import React, { Fragment, ReactNode } from 'react';
import { css } from '@emotion/react';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// styles
import { colors } from 'styles';

// --- styles (GettingStarted) ---
const linkStyles = css`
  &:focus {
    outline: none;
  }
`;

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 100;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.black()};
  background-color: ${colors.white()};
  max-height: 80vh;
  overflow: auto;

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 35rem;
  }

  p,
  li {
    font-size: 0.875rem;
    line-height: 1.375;
  }
`;

const headingStyles = css`
  font-size: 117.6471%;
  text-align: center;
`;

// --- components (GettingStarted) ---
type Props = {
  isOpen: boolean;
  children?: ReactNode;
};

function GettingStarted({ isOpen, children }: Props) {
  const { REACT_APP_SERVER_URL } = process.env;
  const baseUrl = REACT_APP_SERVER_URL || window.location.origin;

  return (
    <DialogOverlay
      css={overlayStyles}
      isOpen={isOpen}
      data-testid="tots-getting-started"
    >
      <DialogContent css={dialogStyles} aria-label="Getting Started">
        <h1 css={headingStyles}>Getting Started</h1>

        <p>
          Create sampling designs and estimate the associated resource demand
          through interactive, point-and-click tools to visually develop
          sampling plans. Review an overview of the steps below:
        </p>

        <ul>
          <li>
            <strong>Locate</strong> – Start here to zoom to a location on the
            map to create a sampling design for an outdoor area.
          </li>
          <li>
            <strong>Add Data</strong> – Begin with an existing sampling design
            or add an indoor environment representation to begin. Layers to
            bring to the project include:
            <ul>
              <li>Samples: Layer containing pre-existing samples</li>
              <li>
                Reference Layer: Additional contextual reference layers to
                include in your analysis (e.g., building footprints, landmarks).
              </li>
              <li>
                Area of Interest: A polygon file that bounds the extent of the
                project area.
              </li>
              <li>
                Visual Sample Plan (VSP): An externally generated Visual Sample
                Plan (VSP) layer to analyze and/or use in conjunction with
                targeted sampling.
              </li>
              <li>
                Contamination Map: When in training mode, adds a layer that
                includes the area and concentrations of contamination.
              </li>
              <li>
                TOTS Sample Plans: Retrieve a previously saved sampling plan.
              </li>
              <li>
                TOTS Custom Sample Type: Add previously saved custom sample
                types for use in creating a sampling plan.
              </li>
            </ul>
          </li>
          <li>
            <strong>Create Plan</strong> – Give a plan a name and description,
            select the layer on which to base the plan, and add targeted samples
            or use the “Add Multiple Random Samples” to draw multiple samples of
            the same type in a specified area of interest. A Resource Tally will
            update as the plan is built. A companion summary table is also
            available detailing the attributes of any samples that are added to
            the plan. Create custom sample types or clone existing sample types
            to support conducting “what-if” scenarios.
          </li>
          <li>
            <strong>Calculate Resources</strong> – Review the default resource
            constraints that are provided to estimate the cost and time required
            to implement the designed plan. Change the default parameters to
            reflect scenario-specific constraints and to support conducting
            “what-if” scenarios. Detailed results can be downloaded into a
            Microsoft Excel spreadsheet.
          </li>
          <li>
            <strong>Configure Output</strong> – Log into the ArcGIS Online
            account to use this feature. Configure what TOTS output is published
            to your ArcGIS Online account. Options include adding a web map,
            incorporating user-defined attributes, and/or publishing custom
            sample types.
          </li>
          <li>
            <strong>Publish Output</strong> – Save and/or share TOTS output to
            your ArcGIS Online account.
          </li>
        </ul>

        <p>
          View the{' '}
          <a
            href={`${baseUrl}/proxy?url=${baseUrl}/data/documents/TOTS-Users-Guide.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            css={linkStyles}
          >
            TOTS User’s Guide (PDF)
          </a>{' '}
          for more detailed instructions
        </p>

        {children && <Fragment>{children}</Fragment>}
      </DialogContent>
    </DialogOverlay>
  );
}

export default GettingStarted;
