// @flow

import React, { ReactNode } from 'react';
// utilities
import { lookupFetch } from 'utils/fetchUtils';

// Common function for setting the context/state of lookup files.
/* function getLookupFile(filename: string, setVariable: Function) {
  // fetch the lookup file
  lookupFetch(filename)
    .then((data) => {
      setVariable({ status: 'success', data });
    })
    .catch((err) => {
      console.error(err);
      setVariable({ status: 'failure', data: err });
    });
} */

// --- components ---
type LookupFile = {
  status: 'fetching' | 'success' | 'failure';
  data: any;
};

type LookupFiles = {
  services: LookupFile;
  setServices: Function;
};

const LookupFilesContext = React.createContext<LookupFiles>({
  services: { status: 'fetching', data: null },
  setServices: () => {},
});

type Props = {
  children: ReactNode;
};

function LookupFilesProvider({ children }: Props) {
  const [services, setServices] = React.useState<LookupFile>({
    status: 'fetching',
    data: {},
  });

  return (
    <LookupFilesContext.Provider
      value={{
        services,
        setServices,
      }}
    >
      {children}
    </LookupFilesContext.Provider>
  );
}

// Custom hook for the services.json file.
let servicesInitialized = false; // global var for ensuring fetch only happens once
function useServicesContext() {
  const { services, setServices } = React.useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!servicesInitialized) {
    servicesInitialized = true;

    // get origin for mapping proxy calls
    const loc = window.location;
    const origin =
      loc.hostname === 'localhost'
        ? `${loc.protocol}//${loc.hostname}:9091`
        : loc.origin;

    // fetch the lookup file
    lookupFetch('config/services.json')
      .then((data) => {
        setServices({ status: 'success', data });
      })
      .catch((err) => {
        console.error(err);
        setServices({ status: 'failure', data: err });
      });
  }

  return services;
}

export { LookupFilesProvider, useServicesContext, LookupFilesContext };
