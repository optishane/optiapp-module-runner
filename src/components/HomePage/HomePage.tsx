import { Button, CircularProgress, Input, TextField, Box, Dialog, List, ListItem } from '@mui/material';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import './Home.css';
import FileWizard from '../FileWizard/FileWizard';
import OptiBarChart from "../OptiBarChart/OptiBarChart";
import ParentSize from '@visx/responsive/lib/components/ParentSize';

// @ts-ignore
import { Api } from "https://cdn.optilogic.app/web/optijs/api.js";
// @ts-ignore
import {File, batch, Job } from "https://cdn.optilogic.app/web/optijs/interfaces.d.ts"

export default function HomePage(props: any) {
    const [appKey, setAppKey] = useState('');
    const [pageView, setPageView] = useState('home');
    const [optiApi, setOptiApi] = useState<null | Api>();
    const [pythonFiles, setPythonFiles] = useState([] as File[]);
    const [loadingText, setLoadingText] = useState('');
    const [loading, setIsLoading] = useState(false);
    const [showErrorText, setShowErrorText] = useState(false)
    const [errorText, setErrorText] = useState('App Key Is Invalid!')
    const [jobsSubmitted, setJobsSubmitted] = useState(false);
    const [maxConcurrency, setMaxConcurrency] = useState(0);

    // chart related state
    const JOBS_DATA_REFRESH_MS = 5000;
    const jobsInterval = useRef(null as any);
    const [data, setData] = useState([] as Job[]);
    const [showModal, setShowModal] = useState(false);

    const handleSubmitAppKey = async () => {
        setIsLoading(true);
        const api = new Api(appKey);
        const userResponse = await api.getUserFromAppKey(appKey);

        if (userResponse instanceof Error) {
            setShowErrorText(true);
            setErrorText('App Key Is Invalid!')
            setPageView('home');
        }
        else {
            setMaxConcurrency(userResponse.apiConcurrentSolvesMax || 0);
            setLoadingText('Retrieving Your Python Modules...');
            setPageView('loading-files');
            setShowErrorText(false);
            setOptiApi(api);
        };
        setTimeout(() => { setIsLoading(false) }, 3000)
    }

    const resetFlow = () => {
        setShowErrorText(false);
        setIsLoading(false)
        setAppKey('')
    };

    const handleSubmitRun = async (files: string[], rs: string) => {
        setJobsSubmitted(true)
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
        setPageView('loading-jobs');

        await optiApi?.workspaceJobify('Studio', batch, rs || 'mini', 'opti-module-runner')
        .catch(err => console.error(err));

        // Subscribe to listening to the jobs after submitting them all.
        jobsInterval.current = window.setInterval(async () => {
            await optiApi?.workspaceJobs('Studio', '', '1').then((res: Job[] | Error) => {
                if(res instanceof Error){
                    return res;
                }
                setData(res.filter((job: Job) => {
                    const sessionStart = parseInt(sessionStorage.getItem('sessionStart') || '0')
                    return new Date(job.submittedDatetime).getTime() > sessionStart;
                }));
                setLoadingText('');
                setPageView('job-view')
            }).catch(err => console.error(err))
        }, JOBS_DATA_REFRESH_MS);

        // Call it right away to allow for faster display of the chart.
        await optiApi?.workspaceJobs('Studio', '', '1').then((res: Job[] | Error) => {
            // Filter jobs from the one day filter response, so we only see the ones ran from this session.
            if(res instanceof Error){
                return res;
            }
            setData(res.filter((job: Job) => {
                const sessionStart = parseInt(sessionStorage.getItem('sessionStart') || '0')
                return new Date(job.submittedDatetime).getTime() > sessionStart;
            }));
            setLoadingText('');
            setPageView('job-view')
        }).catch(err => console.error(err))

    }

    const getStatusSummary = () => {
        const statuses = {};
        data.forEach((item) => {
            item.status in statuses ? statuses[item.status] += 1 : statuses[item.status] = 1
        });

        return data ? Object.keys(statuses).map(item => 
            <ListItem>
                {`${statuses[item]} completed as ${item}`}
            </ListItem>
        ) : <></>
    }

    useEffect(() => {
        if (optiApi) {
            optiApi.workspaceFiles('Studio', '\.py').then((res: File[] | Error) => {
                if (Array.isArray(res)) {
                    setPythonFiles(res);
                    setPageView('wizard');
                }
                else {
                    setPageView('home')
                    resetFlow();
                    setShowErrorText(true);
                }
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
                    {showErrorText && <b style={{ marginBottom: '1rem', color: '#ef5350' }}>{errorText}</b>}
                    <TextField
                        className='input'
                        variant='standard'
                        onChange={(e: any) => setAppKey(e.target.value)}
                        value={appKey}
                        placeholder='Enter Your App Key'
                        inputProps={{ className: 'input' }}
                    />
                    <Button disabled={loading || appKey.length === 0} className={loading || appKey.length === 0 ? "get-started-btn-disabled" : "get-started-btn"} onClick={handleSubmitAppKey}>
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
                            <Box sx={{ height: '90%', width: '70%' }}>
                                <ParentSize>
                                    {({ width, height }) => <OptiBarChart width={width} height={height} data={data} xAxisCategory="status" stackCategory="jobInfo.filename" maxLine={maxConcurrency} />}
                                </ParentSize>
                            </Box> :
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <h2>
                                    {jobsSubmitted && data.length == 0 ? 'Waiting for Modules to Start' : pageView == 'loading-files' ? '' : 'Select Python Modules to Run'}
                                </h2>
                                {jobsSubmitted && data.length == 0 ? <CircularProgress sx={{ color: '#f9f9f9' }} /> : <></>}
                            </div>
                    }
                </div>
            }

            <Dialog onClose={handleClose} open={showModal}>
                <div className='finish-dialog'>
                    <h3 style={{ margin: '1rem' }}>Your Jobs Have Finished!</h3>
                    <div>
                        <List>
                            {getStatusSummary()}
                        </List>
                    </div>
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