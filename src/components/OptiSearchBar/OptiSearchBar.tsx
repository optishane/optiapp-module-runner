import { IconButton, OutlinedInput } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { MdClear } from 'react-icons/md';

export interface searchbarProps {
    onClearSearch: () => void,
    onChange: (search: string) => void,
    value: string,
    id?: string
}

export default function OptiSearchbar(props: searchbarProps) {
    const { onClearSearch, onChange, value } = props;

    useEffect(() => {
        //
    }, [props.value]);

    return (
        <OutlinedInput
            id={props.id}
            fullWidth
            autoComplete='off'
            placeholder='Search'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            endAdornment={value.length > 0 ?
                <IconButton onClick={() => onClearSearch()}>
                    <MdClear style={{ height: '1rem', width: '1rem', minHeight: '1rem', minWidth: '1rem' }} />
                </IconButton>
                :
                <IconButton disabled>
                    <FaSearch style={{ height: '1rem', width: '1rem', minHeight: '1rem', minWidth: '1rem' }} />
                </IconButton>}
            sx={{
                height: '2rem',
                padding: '0.25rem'
            }}
        />
    );
}
