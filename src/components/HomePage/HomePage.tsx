import { Button, CircularProgress, Input, TextField, Box } from '@mui/material';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import './Home.css';
import FileWizard from '../FileWizard/FileWizard';
import OptiBarChart from "../OptiBarChart/OptiBarChart";
import ParentSize from '@visx/responsive/lib/components/ParentSize';
// @ts-ignore
// import { Api } from "https://cdn.optilogic.app/web/optijs/api.js";
import { Api } from '../Api.ts';
// <script type="module" src=""></script>

interface File {
    filename: string,
    directoryPath: string,
    contentLength: number,
    filePath: string,
}

interface batchItem {
    pyModulePath: string;
    pySearchTerm?: string;
    commandArg?: string;
    timeout?: string;
}

interface batch {
    batchItems: batchItem[];
}

interface JobResponse {
    count: number,
    filters: Object,
    jobs: Job[],
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

export default function HomePage(props: any) {
    const [appKey, setAppKey] = useState('');
    const [pageView, setPageView] = useState('home');
    const [optiApi, setOptiApi] = useState<null | Api>();
    const [pythonFiles, setPythonFiles] = useState([] as File[]);
    const [promptActivity, setPromptActivity] = useState(false);
    const [loadingText, setLoadingText] = useState('');

    // chart related state
    const JOBS_DATA_REFRESH_MS = 10000;
    const jobsInterval = useRef(null as any);
    const [data, setData] = useState([] as Job[]);

    const handleSubmitAppKey = async () => {
        setLoadingText('Retrieving Your Python Files...');
        setPageView('loading');
        const api = new Api(appKey);
        setOptiApi(api);
    }

    const handleSubmitRun = async (files: string[]) => {
        const batch: batch = {
            batchItems: files.map((item, idx) => {
                return {
                    pyModulePath: item,
                    commandArgs: '',
                    timeout: '240',
                }
            })
        }
        setLoadingText('Submitting Your Jobs...');
        setPageView('loading');

        await optiApi?.workspaceJobify('Studio', batch, '3xs', 'run from 3rd party app!, OptiJS')
        .catch((err: any) => console.error(err));

        // Subscribe to listening to the jobs after submitting them all.
        jobsInterval.current = window.setInterval(async () => {
            await optiApi?.workspaceJobs('Studio', '', 'all').then((res: any) => {
                setData(res.jobs.filter((job: Job) => {
                    const sessionStart = parseInt(sessionStorage.getItem('sessionStart') || '0')
                    return new Date(job.submittedDatetime).getTime() > sessionStart;
                }));
                setLoadingText('');
                setPageView('job-view')
            }).catch((err: any) => console.error(err))
        }, JOBS_DATA_REFRESH_MS);

        // Call it right away to allow for faster display of the chart.
        await optiApi?.workspaceJobs('Studio', '', '1').then((res: any) => {
            // Filter jobs from the one day filter response, so we only see the ones ran from this session.
            setData(res.jobs.filter((job: Job) => {
                const sessionStart = parseInt(sessionStorage.getItem('sessionStart') || '0')
                return new Date(job.submittedDatetime).getTime() > sessionStart;
            }));
            setLoadingText('');
            setPageView('job-view')
        }).catch((err: any) => console.error(err))

    }

    useEffect(() => {
        if (optiApi) {
            optiApi.workspaceFiles('Studio', '\.py').then((res: any) => {
                setPythonFiles(res.files);
                setPageView('wizard');
            });
        }

        const sessionStart = Date.now();
        sessionStorage.setItem('sessionStart', `${sessionStart}`);
    }, [optiApi])

    useEffect(() => {
        const terminalStates = ['done', 'stopped', 'error', 'cancelled'];

        // If every job has reached its end, wipe the interval, and prompt the user .
        if (data.every((job) => terminalStates.includes(job.status))) {
            window.clearInterval(jobsInterval.current as any);
            setPromptActivity(true);
        }

    }, [data])

    if (pageView == 'loading') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} className="home-wrapper">
                <h2>
                    {loadingText}
                </h2>
                <CircularProgress sx={{ color: '#f9f9f9' }} />
            </div>
        );
    }

    return (
        <div className="home-wrapper">
            {pageView === 'home' &&
                <>
                    <h1>
                        Welcome to the Python Module Runner
                    </h1>
                    <TextField variant='standard' className="input" onChange={(e: any) => setAppKey(e.target.value)} value={appKey} placeholder='Enter Your App Key' />
                    <Button className="get-started-btn" onClick={handleSubmitAppKey}>
                        Blast Off
                    </Button>
                </>
            }

            {pageView === 'wizard' &&
                <FileWizard files={pythonFiles} onSubmitRun={(files: string[]) => handleSubmitRun(files)} />
            }

            {pageView === 'job-view' &&
                <Box sx={{ height: '90%', width: '90%' }}>
                    <ParentSize>
                        {({ width, height }) => <OptiBarChart width={width} height={height} data={data} xAxisCategory="status" stackCategory="jobInfo.filename" />}
                    </ParentSize>
                </Box>
            }
        </div>
    )
}