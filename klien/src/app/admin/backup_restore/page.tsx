import { Metadata } from 'next';
import BackupRestoreClient from './components/backup_restore_client';

export const metadata: Metadata = {
    title: 'Backup & Restore',
};

export default function BackupRestorePage() {
  return <BackupRestoreClient />;
}