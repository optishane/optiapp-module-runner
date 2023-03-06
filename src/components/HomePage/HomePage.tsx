import { Box, Button, CircularProgress, Dialog, TextField } from '@mui/material';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { useEffect, useRef, useState } from 'react';
// @ts-ignore
// import { Api } from "https://cdn.optilogic.app/web/optijs/api.js";
import { Api } from '../Api.ts';
import FileWizard from '../FileWizard/FileWizard';
import OptiBarChart from "../OptiBarChart/OptiBarChart";
import './Home.css';

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
    const [loadingText, setLoadingText] = useState('');
    const [jobsSubmitted, setJobsSubmitted] = useState(false);

    // chart related state
    const JOBS_DATA_REFRESH_MS = 5000;
    const jobsInterval = useRef(null as any);
    const [data, setData] = useState([] as Job[]);
    const [showModal, setShowModal] = useState(false);

    const handleSubmitAppKey = async () => {
        setLoadingText('Retrieving Your Python Modules...');
        setPageView('loading-files');
        const api = new Api(appKey);
        setOptiApi(api);
    }

    const handleSubmitRun = async (files: string[], rs: string) => {
        setJobsSubmitted(true);
        const batch: batch = {
            batchItems: files.map((item, idx) => {
                return {
                    pyModulePath: item,
                    commandArgs: '',
                    timeout: '240',
                }
            })
        }
        setLoadingText('Submitting Module Runs...');
        setPageView('loading-jobs');

        await optiApi?.workspaceJobify('Studio', batch, rs || '3xs', 'opti-module-runner')
            .catch((err: any) => console.error(err));

        // Subscribe to listening to the jobs after submitting them all.
        if (jobsInterval.current) {
            window.clearInterval(jobsInterval.current as any);
        }
        jobsInterval.current = window.setInterval(async () => {
            await optiApi?.workspaceJobs('Studio', '', '1').then((res: any) => {
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

        // If every job has reached its end, wipe the interval, and prompt the user.
        if (data.length > 0 && data.every((job) => terminalStates.includes(job.status))) {
            window.clearInterval(jobsInterval.current as any);
            setShowModal(true);
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

    const handleClose = () => {
        setShowModal(false);
    }

    return (
        <div className="home-wrapper">
            {pageView === 'home' &&
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h1>
                        Welcome To OptiJS
                    </h1>
                    <p className='app-link'>
                        <a className='keylink' target="_blank" rel='noreferrer noopener' href='https://optilogic.app/#/user-account?tab=appkey'>
                            Copy or Create a New App Key
                        </a>
                    </p>
                    <TextField variant='standard' inputProps={{ className: 'input' }} className="input" onChange={(e: any) => setAppKey(e.target.value)} value={appKey} placeholder='Enter Your App Key' />
                    <Button className="get-started-btn" onClick={handleSubmitAppKey}>
                        Blast Off
                    </Button>
                </div>
            }

            {pageView !== 'home' &&
                <div style={{ display: 'flex', height: '100%', flexGrow: 1, alignItems: 'center', padding: '1rem', columnGap: '1rem' }}>
                    {pageView == 'loading-files' ?
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <h2>
                                {loadingText}
                            </h2>
                            <CircularProgress sx={{ color: '#f9f9f9' }} />
                        </div> :
                        <FileWizard files={pythonFiles} onSubmitRun={(files: string[], rs: string) => handleSubmitRun(files, rs)} />
                    }
                    {pageView == 'loading-jobs' ?
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <h2>
                                {loadingText}
                            </h2>
                            <CircularProgress sx={{ color: '#f9f9f9' }} />
                        </div> :
                        data.length > 0 ?
                            <Box sx={{ height: '90%', width: '90%' }}>
                                <ParentSize>
                                    {({ width, height }) => <OptiBarChart width={width} height={height} data={data} xAxisCategory="status" stackCategory="jobInfo.filename" />}
                                </ParentSize>
                            </Box> :
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <h2>
                                    { jobsSubmitted && data.length == 0 ? 'Waiting for Modules to Start' : pageView == 'loading-files' ? '' : 'Select Python Modules to Run'}
                                </h2>
                                {jobsSubmitted && data.length == 0 ? <CircularProgress sx={{ color: '#f9f9f9' }} /> : <></> }
                            </div>
                    }
                </div>
            }

            <Dialog onClose={handleClose} open={showModal}>
                <div className='finish-dialog'>
                    <h3 style={{ margin: '1rem' }}>Your Jobs Have Finished!</h3>
                    <div style={{ display: 'flex', flexDirection: 'row', columnGap: '1rem', margin: '1rem' }}>
                        <Button variant='contained' onClick={handleClose}>
                            Dismiss
                        </Button>
                        <Button variant='contained' target='_blank' href='https://optilogic.app/#/jobs-dashboard'>
                            View In Optilogic
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}