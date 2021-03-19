// @flow

import React, { ReactNode } from 'react';
// utilities
import { lookupFetch } from 'utils/fetchUtils';
// config
import { SampleSelectType } from 'config/sampleAttributes';

// Common function for setting the context/state of lookup files.
function getLookupFile(filename: string, setVariable: Function) {
  // fetch the lookup file
  lookupFetch(filename)
    .then((data) => {
      setVariable({ status: 'success', data });
    })
    .catch((err) => {
      console.error(err);
      setVariable({ status: 'failure', data: err });
    });
}

// --- components ---
type LookupFile = {
  status: 'fetching' | 'success' | 'failure';
  data: any;
};

type LookupFiles = {
  sampleTypes: any;
  setSampleTypes: Function;
  services: LookupFile;
  setServices: Function;
};

const LookupFilesContext = React.createContext<LookupFiles>({
  sampleTypes: { status: 'fetching', data: null },
  setSampleTypes: () => {},
  services: { status: 'fetching', data: null },
  setServices: () => {},
});

type Props = {
  children: ReactNode;
};

function LookupFilesProvider({ children }: Props) {
  const [sampleTypes, setSampleTypes] = React.useState<LookupFile>({
    status: 'fetching',
    data: {},
  });
  const [services, setServices] = React.useState<LookupFile>({
    status: 'fetching',
    data: {},
  });

  return (
    <LookupFilesContext.Provider
      value={{
        sampleTypes,
        setSampleTypes,
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

// Custom hook for the documentOrder.json lookup file.
let sampleTyepsInitialized = false; // global var for ensuring fetch only happens once
function useSampleTypesContext() {
  const { sampleTypes, setSampleTypes } = React.useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!sampleTyepsInitialized) {
    sampleTyepsInitialized = true;
    getLookupFile('sampleTypes/sampleTypes.json', (newValue: LookupFile) => {
      if (newValue.status !== 'success') {
        setSampleTypes(newValue);
        return;
      }

      const sampleSelectOptions: SampleSelectType[] = [];
      const sampleAttributes = newValue.data.sampleAttributes;
      Object.keys(sampleAttributes).forEach((key: any) => {
        const value = sampleAttributes[key].TYPEUUID;
        const label = sampleAttributes[key].TYPE;
        sampleSelectOptions.push({ value, label, isPredefined: true });
      });
      newValue.data['sampleSelectOptions'] = sampleSelectOptions;
      setSampleTypes(newValue);
    });
  }

  return sampleTypes;
}

export {
  LookupFilesContext,
  LookupFilesProvider,
  useSampleTypesContext,
  useServicesContext,
};
