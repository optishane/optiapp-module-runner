import { Box, Checkbox, Paper, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, Button } from '@mui/material';
import React, { useState, useEffect, } from 'react';
import './FileWizard.css';

interface FileWizardProps {
    files: File[],
    onSubmitRun: (files: string[]) => void
}

interface File {
    filename: string,
    directoryPath: string,
    contentLength: number,
    filePath: string,
}


export default function FileWizard(props: FileWizardProps) {
    const { files, onSubmitRun } = props;
    const [selected, setSelected] = useState([] as string[]);
    const [numSelected, setNumSelected] = useState(0);
    const [rowCount, setRowCount] = useState(files.length);


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

    const isSelected = (name: string) => selected.indexOf(name) !== -1;

    return (
        <div className='file-wiz-wrapper'>
            <Box sx={{ width: '100%' }}>
                <Paper sx={{ width: '100%', mb: 2 }}>
                    <Table stickyHeader>
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
                                    Select All
                                </TableCell>
                                <TableCell>
                                    <Button className="run-files-btn" onClick={() => onSubmitRun(selected)}>
                                        Run Files
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.slice().map((fileRow, idx) => {
                                const isItemSelected = isSelected(fileRow.filePath);
                                const labelId = `enhanced-table-checkbox-${idx}`;
                                
                                if(!fileRow.filename.endsWith('.py')){
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
                                        <TableCell>

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