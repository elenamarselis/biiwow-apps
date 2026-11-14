import { Suspense } from 'react';
import { Today } from '@/components/Today';
export default function TodayPage() {
  return <Suspense fallback={<div className="card"><div className="skeleton" /></div>}><Today /></Suspense>;
}
