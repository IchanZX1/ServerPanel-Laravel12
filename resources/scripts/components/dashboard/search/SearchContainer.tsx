import React, { useState } from 'react';
import MaterialIcon from '@/components/elements/MaterialIcon';
import useEventListener from '@/plugins/useEventListener';
import SearchModal from '@/components/dashboard/search/SearchModal';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import tw from 'twin.macro';

interface Props {
    /**
     * Bila diisi, komponen dirender sebagai baris penuh (ikon + label + hint
     * pintasan) agar cocok dipakai di dalam sidebar. Tanpa prop ini perilaku
     * lamanya (ikon saja + tooltip) dipertahankan.
     */
    label?: string;
}

export default ({ label }: Props) => {
    const [visible, setVisible] = useState(false);

    useEventListener('keydown', (e: KeyboardEvent) => {
        if (['input', 'textarea'].indexOf(((e.target as HTMLElement).tagName || 'input').toLowerCase()) < 0) {
            if (!visible && e.metaKey && e.key.toLowerCase() === '/') {
                setVisible(true);
            }
        }
    });

    if (label) {
        return (
            <>
                {visible && <SearchModal appear visible={visible} onDismissed={() => setVisible(false)} />}
                <button className={'navigation-link'} type={'button'} onClick={() => setVisible(true)}>
                    <MaterialIcon name={'search'} size={20} />
                    <span css={tw`flex-1`}>{label}</span>
                    <kbd css={tw`text-2xs font-mono text-neutral-500 border border-neutral-700 rounded-xs px-1.5 py-0.5`}>
                        Ctrl+/
                    </kbd>
                </button>
            </>
        );
    }

    return (
        <>
            {visible && <SearchModal appear visible={visible} onDismissed={() => setVisible(false)} />}
            <Tooltip placement={'bottom'} content={'Search'}>
                <div className={'navigation-link'} onClick={() => setVisible(true)}>
                    <MaterialIcon name={'search'} size={20} />
                </div>
            </Tooltip>
        </>
    );
};
