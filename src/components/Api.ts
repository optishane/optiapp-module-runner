import path from 'path-browserify';

interface batchItem {
  pyModulePath: string;
  pySearchTerm?: string;
  commandArg?: string;
  timeout?: string;
}

interface batch {
  batchItems: batchItem[];
}

interface storageDevice {
  type: "string";
}

interface OptiError {
  error: Error,
  message?: string,
}

interface File {
  filename: string,
  directoryPath: string,
  contentLength: number,
  filePath: string,
}

interface User {
  name: string,
  username: string,
  email: string,
  apiConcurrentSolvesMax: number,
  workspaceCount: number,
}

interface Job {
  billedTime: string,
  endDateTime: string,
  jobInfo: {
    command: string,
    directoryPath: string,
    filename: string,
    resourceConfig: {
      cpu: string,
      name: string,
      ram: string,
      run_rate: number
    },
    tags: string,
    timeout: string,
    workspace: string
  },
  jobKey: string,
  runRate: number,
  runTime: string,
  startDatetime: string,
  status: string,
  submittedDatetime: string
}

const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

// CHANGE apiDomain TO BE PROD's API IF TEST IS DOWN
export class Api {
  apiDomain?: string = "https://dev-api.optilogic.app";
  apiCrashCount?: number = 0;
  authAppKey: string;
  authReqHeader?: HeadersInit;
  authUsername?: string;
  apiVersion?: string;

  STORAGE_DEVICE_TYPES = [
    "azure_afs",
    "azure_workspace",
    "onedrive",
    "postgres_db",
  ];
  DATABASE_TEMPLATES = [
    "empty",
    "anura_2_4_clean",
    "anura_2_5_clean",
    "anura_2_4_blast_off_to_space",
    "anura_2_5_blast_off_to_space",
    "12d0e352-8f06-45aa-b3ba-58d6d93d3186",
    "37392edb-d582-4ce8-9f75-024651aa8592",
    "67a881b3-b6ab-4e95-9452-6dae8e831a6b",
    "71214744-f90a-4dcc-8008-bb9dab9493be",
    "812d6fae-9fe7-4541-bee5-3cdb78e03eeb",
    "b69f11eb-ed38-4b72-a43d-d59f7ab2cfa6",
    "d74fd9cc-e829-4ad3-9f33-f4ef0f3ddae1",
  ];
  GEO_PROVIDERS = ["bing", "google", "mapbox", "pcmiler", "ptv"];
  JOB_STATES = [
    "submitted",
    "starting",
    "started",
    "running",
    "done",
    "stopping",
    "stopped",
    "canceling",
    "cancelled",
    "error",
  ];

  /*    
    EXAMPLE CONFIG
    @param un: string, string representing username. Required for either authentication method
    @param appKey: str: this field will be the user's password.
    */

  constructor(appKey: string, un?: string, version?: number) {
    this.authAppKey = appKey;
    this.authReqHeader = {
      "x-app-key": this.authAppKey,
      "Content-Type": "application/json",
    };
    this.authUsername = un;

    console.assert(appKey.slice(0, 3) === "op_");
    console.assert(appKey.length === 51);

    const defaultVersion = 0;

    if (!version) version = defaultVersion;

    if (version && version > 0) {
      console.warn(
        `API version ${version} not supported. Defaulting to version zero`
      );
      version = 0;
    }

    this.apiVersion = `${this.apiDomain}/v${version}/`;
  }

  /**
    GET /v0/{workspace}/jobs - get list of the jobs for a specific workspace
    @param wksp: str:  where your files live
    @param command: str: run, presolve, run_custom, run_default, supplychain-3echelon, estimate, accelerate, supplychain-2echelon
    @param history: str: all, or n days ago
    @param runSecsMax: int: maximum runtime in secs
    @param runSecsMin: int: minimum runtime in secs
    @param status: str: done, error, submitted, starting, running, cancelled, stopped, cancelling, stopping
    @param tags: str: filter jobs where csv string matches
    */
  async workspaceJobs(
    wksp: string,
    command?: string,
    history?: string,
    status?: string,
    runSecsMin?: number,
    runSecsMax?: string,
    tags?: string
  ): Promise<Job[] | Error> {
    let url = `${this.apiVersion}${wksp}/jobs?`;

    let query = "";
    query += history ? `&history=${history}` : "";
    query += command ? `&command=${command}` : "";
    query += status ? `&status=${status}` : "";
    query += runSecsMin ? `&tags=${runSecsMin}` : "";
    query += runSecsMax ? `&tags=${runSecsMax}` : "";
    query += tags ? `&tags=${tags}` : "";

    if (query.length > 0) {
      url += query.slice(1, query.length);
    }

    return await fetch(url, {
      headers: this.authReqHeader,
    })
      .then((res) => res.json())
      .then(res => res.jobs)
      .catch(err => err);
  }

  /**
    POST /v0/{workspace}/jobBatch/jobify - batch queue many jobs
    Will create a job for each python module provided
    @param wksp: str: workspace scope 
    @param batch: dict: list of py modules to run and their config
    @param resourceConfig: str: 3xs, 2xs, xs, s, m, l, xl, 2xl
    @param tags: str: earmark the job record
    INPUT DIRECTIVE
    :batch: dict: payload to send in body of the request
    :batchItems: list: find python modules to execute
    :pyModulePath: str: absolute file path of the python module to execute
    :commandArgs: str: arguments to pass to associated python module
    :timeout: int: max run time of the associated python module
    {"batchItems":[
        {
            "pyModulePath":"/projects/My Models/Transportation/France.py",
            "commandArgs":"diesel",
            "timeout": 100
        }]
    }
    */
  async workspaceJobify(
    wksp: string,
    batch: batch,
    resourceConfig?: string,
    tags?: string
  ): Promise<boolean | Error> {
    let url = `${this.apiVersion}${wksp}/jobBatch/jobify?`;
    let query = "";
    query += resourceConfig ? `&resourceConfig=${resourceConfig}` : "";
    query += tags ? `&tags=${tags}` : "";

    if (query.length > 0) {
      url += query.slice(1, query.length);
    }

    // console.log("==========BATCH=========:", batch);

    return await fetch(url, {
      headers: this.authReqHeader,
      method: "POST",
      body: JSON.stringify(batch),
    })
      .then(res => res.json())
      .then(res => res.status === "success" ? true : false)
      .catch(err => err)
  }

  /**GET ​/v0​/{workspace}​/files - List all user files in the workspace
        
    @param wksp: str: where your files live
    @param filter: str: regex str on full file path, defautls to None
    */
  async workspaceFiles(wksp: string, filter?: string): Promise<File[] | Error> {
    let url = `${this.apiVersion}${wksp}/files`;
    url += filter ? `?filter=${filter}` : "";

    return await fetch(url, {
      headers: this.authReqHeader,
    })
      .then(res => res.json())
      .then(res => res.files)
      .catch(err => err);
  }

  //GET AUTH app key
  async authorizeAppKey(appKey: string): Promise<boolean | Error> {
    let url = `${this.apiVersion}account`;
    return await fetch(url, {
      method: "GET",
      headers: {
        "X-APP-KEY": appKey
      }
    })
      .then(res => res.json())
      .then(res => res.result.toLowerCase() === 'success' ? true : false)
      .catch(err => err);
  }

  //GET AUTH app key
  async getUserFromAppKey(appKey: string): Promise<User | Error> {
    let url = `${this.apiVersion}account`;
    return await fetch(url, {
      method: "GET",
      headers: {
        "X-APP-KEY": appKey
      }
    })
      .then(res => res.json())
      .catch(err => err);
  }
}
