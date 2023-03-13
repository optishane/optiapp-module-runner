import { Box, Checkbox, Paper, Table, TableBody, TableCell, MenuItem, TableHead, TableRow, Button, Select, TextField, Autocomplete } from '@mui/material';
import React, { useState, useEffect, } from 'react';
import './FileWizard.css';
import OptiSearchbar from '../OptiSearchBar/OptiSearchBar';

// @ts-ignore
import { Api } from "https://cdn.optilogic.app/web/optijs/api.js";
// @ts-ignore
import {File, batch, Job } from "https://cdn.optilogic.app/web/optijs/interfaces.d.ts"

interface FileWizardProps {
    files: File[],
    onSubmitRun: (files: string[], resourceSize: string) => void
}

// interface File {
//     filename: string,
//     directoryPath: string,
//     contentLength: number,
//     filePath: string,
// }

interface RunConfigOptions {
    size: string;
    cpu: string;
    ram: string;
    billingFactor: string;
}


export default function FileWizard(props: FileWizardProps) {
    const { files, onSubmitRun } = props;
    const [filteredFiles, setFilteredFiles] = useState(files as File[]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([] as string[]);
    const [numSelected, setNumSelected] = useState(0);
    const [rowCount, setRowCount] = useState(files.length);
    const [resourceSize, setResourceSize] = useState({ size: 'mini' } as RunConfigOptions);
    const [timeoutHolder, setTimeoutHolder] = useState<any>(null);
    const resourceTypes: RunConfigOptions[] = [
        {
            size: 'mini',
            cpu: 'CPU: 0.5vCore',
            ram: 'RAM: 500Mb',
            billingFactor: 'Billing Factor: 0.5'
        },
        {
            size: '4XS',
            cpu: 'CPU: 1vCore',
            ram: 'RAM: 1Gb',
            billingFactor: 'Billing Factor: 1'
        },
        {
            size: '3XS',
            cpu: 'CPU: 1vCore',
            ram: 'RAM: 2Gb',
            billingFactor: 'Billing Factor: 2'
        },
        {
            size: '2XS',
            cpu: 'CPU: 2vCore',
            ram: 'RAM: 4Gb',
            billingFactor: 'Billing Factor: 3'
        },
        {
            size: 'XS',
            cpu: 'CPU: 4cVore',
            ram: 'RAM: 8Gb',
            billingFactor: 'Billing Factor: 4'
        },
        {
            size: 'S',
            cpu: 'CPU: 4vCore',
            ram: 'RAM: 16Gb',
            billingFactor: 'Billing Factor: 5'
        }
    ]


    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = files.map((n) => n.filePath);
            setSelected(newSelected);
            setNumSelected(newSelected.length);
            return;
        }
        setSelected([]);
        setNumSelected(0);
    };

    const handleClick = (event: React.MouseEvent<unknown>, filename: string) => {
        const selectedIndex = selected.indexOf(filename);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, filename);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
        setNumSelected(newSelected.length);
    };

    const handleSearch = (search: string) => {
        setSearch(search);
        if (timeoutHolder !== null) {
            clearTimeout(timeoutHolder);
        }
        setTimeoutHolder(() => setTimeout(() => doSearch(search), 300));
    };

    const doSearch = (search: string) => {
        if (search.length === 0) {
            setFilteredFiles(files);
        }
        else {
            setFilteredFiles(files.filter((item) => item.filePath.includes(search)))
        }
    }

    useEffect(() => {
        //
    }, [search])

    const isSelected = (name: string) => selected.indexOf(name) !== -1;

    return (
        <div className='file-wiz-wrapper'>
            <Box sx={{ width: '120%', minWidth: '120%' }}>
                <Paper sx={{ width: '100%', mb: 2}}>
                    <Table stickyHeader size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        color="primary"
                                        indeterminate={numSelected > 0 && numSelected < rowCount}
                                        checked={rowCount > 0 && numSelected === rowCount}
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            'aria-label': 'select all',
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div style={{ display: 'flex', alignItems: 'center', columnGap: '1rem' }}>
                                        <b>
                                            {`${selected.length} of ${files.length} Selected`}
                                        </b>
                                        <div style={{ width: '15%' }}>
                                            <OptiSearchbar value={search} onChange={handleSearch} onClearSearch={() => handleSearch('')} />
                                        </div>
                                        <Autocomplete
                                            size='small'
                                            id='resourceConfig'
                                            sx={{ width: '20%', marginLeft: '1rem' }}
                                            value={resourceSize ? resourceSize : { size: 'mini' } as RunConfigOptions}
                                            inputValue={resourceSize.size}
                                            isOptionEqualToValue={(option, value) => option.size === value.size}
                                            getOptionLabel={option => option.size}
                                            options={resourceTypes}
                                            onChange={(e, value) => value && setResourceSize(value)}
                                            renderOption={(props, option: RunConfigOptions) => (
                                                <Box component='li' {...props} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', borderBottom: '1px solid #909090', margin: 'none' }}>
                                                    <div>
                                                        <div className='select-card-details'>
                                                            <div style={{ marginRight: '2.5rem' }}>
                                                                {option.size}
                                                            </div>
                                                            <div className='device-info-wrapper'>
                                                                <div>
                                                                    {option.cpu}
                                                                </div>
                                                                <div>
                                                                    {option.ram}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', color: '#909090' }}>
                                                            {option.billingFactor}
                                                        </div>
                                                    </div>
                                                </Box>
                                            )}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    sx={{ fontSize: '12px' }} />)}
                                        />
                                        <Button disabled={selected.length === 0} className={selected.length > 0 ? "run-files-btn" : "disabled-run-files-btn"} onClick={() => onSubmitRun(selected, resourceSize.size)}>
                                            Submit Jobs
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredFiles.slice().map((fileRow, idx) => {
                                const isItemSelected = isSelected(fileRow.filePath);
                                const labelId = `enhanced-table-checkbox-${idx}`;

                                if (!fileRow.filename.endsWith('.py')) {
                                    return;
                                }

                                return (
                                    <TableRow
                                        hover
                                        onClick={(event) => handleClick(event, fileRow.filePath)}
                                        role='checkbox'
                                        aria-checked={isItemSelected}
                                        tabIndex={-1}
                                        key={`${fileRow.filePath}${idx}`}
                                        selected={isItemSelected}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                                inputProps={{
                                                    'aria-labelledby': labelId,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell
                                            component="th"
                                            id={labelId}
                                            scope="row"
                                            padding="none"
                                        >
                                            {fileRow.filePath}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                        {/* <TableFooter>

                        </TableFooter> */}
                    </Table>
                </Paper>
            </Box>
        </div>
    );
}