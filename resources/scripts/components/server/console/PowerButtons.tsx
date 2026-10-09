import React, { useEffect, useState } from 'react';
import Can from '@/components/elements/Can';
import { ServerContext } from '@/state/server';
import { PowerAction } from '@/components/server/console/ServerConsoleContainer';
import { Dialog } from '@/components/elements/dialog';
import MaterialIcon from '@/components/elements/MaterialIcon';
import tw from 'twin.macro';

interface PowerButtonProps {
    className?: string;
}

export default ({ className }: PowerButtonProps) => {
    const [open, setOpen] = useState(false);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);

    const killable = status === 'stopping';
    const onButtonClick = (
        action: PowerAction | 'kill-confirmed',
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ): void => {
        e.preventDefault();
        if (action === 'kill') {
            return setOpen(true);
        }

        if (instance) {
            setOpen(false);
            instance.send('set state', action === 'kill-confirmed' ? 'kill' : action);
        }
    };

    useEffect(() => {
        if (status === 'offline') {
            setOpen(false);
        }
    }, [status]);

    return (
        <div className={className}>
            <Dialog.Confirm
                open={open}
                hideCloseIcon
                onClose={() => setOpen(false)}
                title={'Forcibly Stop Process'}
                confirm={'Continue'}
                onConfirmed={onButtonClick.bind(this, 'kill-confirmed')}
            >
                Forcibly stopping a server can lead to data corruption.
            </Dialog.Confirm>
            {/*
             * Tombol daya bergaya brief-1. Varian `Button` bawaan tidak dipakai
             * karena mockup mematok kelas persisnya (Start abu-abu redup saat
             * nonaktif, Restart cyan menyala, Stop/Kill merah lembut).
             * Logika `onButtonClick` + dialog konfirmasi kill tidak berubah.
             */}
            <Can action={'control.start'}>
                <button
                    type={'button'}
                    disabled={status !== 'offline'}
                    onClick={onButtonClick.bind(this, 'start')}
                    css={tw`flex items-center gap-1.5 px-3 py-2 rounded-lg font-label-md text-label-md transition-colors bg-surface-container-high text-text-muted disabled:opacity-60 disabled:cursor-not-allowed enabled:hover:bg-surface-container-highest enabled:text-text-primary`}
                >
                    <MaterialIcon name={'play_arrow'} size={18} />
                    Start
                </button>
            </Can>
            <Can action={'control.restart'}>
                <button
                    type={'button'}
                    disabled={!status}
                    onClick={onButtonClick.bind(this, 'restart')}
                    css={tw`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors bg-cyan-600 hover:bg-cyan-500 text-text-primary shadow-[0_0_12px_rgba(8,145,178,0.35)] disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    <MaterialIcon name={'restart_alt'} size={18} />
                    Restart
                </button>
            </Can>
            <Can action={'control.stop'}>
                <button
                    type={'button'}
                    disabled={status === 'offline'}
                    onClick={onButtonClick.bind(this, killable ? 'kill' : 'stop')}
                    css={tw`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors bg-danger-bg hover:bg-danger text-danger hover:text-text-primary disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    <MaterialIcon name={'power_settings_new'} size={18} />
                    {killable ? 'Kill' : 'Stop'}
                </button>
            </Can>
        </div>
    );
};
