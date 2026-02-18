import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { turtleAlbumService } from '@/services/turtleAlbumService';
import type { Sex } from '@/types/turtleAlbum';

const sexLabel = (sex?: Sex | null) => {
  if (sex === 'male') return '公';
  if (sex === 'female') return '母';
  return '-';
};

const SeriesFeed: React.FC = () => {
  const [seriesId, setSeriesId] = React.useState<string | 'all'>('all');
  const [sex, setSex] = React.useState<Sex | 'all'>('all');

  const seriesQ = useQuery({
    queryKey: ['turtle-album', 'series'],
    queryFn: () => turtleAlbumService.listSeries(),
  });

  const breedersQ = useQuery({
    queryKey: ['turtle-album', 'breeders', { seriesId, sex }],
    queryFn: () =>
      turtleAlbumService.listBreeders({
        seriesId: seriesId === 'all' ? undefined : seriesId,
        sex: sex === 'all' ? undefined : sex,
        limit: 200,
      }),
  });

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6">
          <div className="text-xs uppercase tracking-widest text-neutral-500">turtle album</div>
          <h1 className="mt-2 text-2xl font-semibold">龟龟图鉴</h1>
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-neutral-600">系列</div>
            <select
              className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value as any)}
            >
              <option value="all">全部</option>
              {(seriesQ.data || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="ml-2 text-sm text-neutral-600">性别</div>
            <select
              className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
              value={sex}
              onChange={(e) => setSex(e.target.value as any)}
            >
              <option value="all">全部</option>
              <option value="female">母</option>
              <option value="male">公</option>
            </select>

            {seriesQ.isLoading || breedersQ.isLoading ? (
              <div className="ml-auto text-xs text-neutral-500">loading...</div>
            ) : null}
          </div>

          {seriesQ.isError ? (
            <div className="text-sm text-red-600">series: {(seriesQ.error as Error).message}</div>
          ) : null}
          {breedersQ.isError ? (
            <div className="text-sm text-red-600">breeders: {(breedersQ.error as Error).message}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {(breedersQ.data || []).map((b) => (
            <Link
              key={b.id}
              to={`/breeder/${b.id}`}
              className="group rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-medium group-hover:underline">{b.name}</div>
                  <div className="mt-1 text-xs text-neutral-500">{b.code}</div>
                  <div className="mt-2 text-sm text-neutral-700 line-clamp-2">{b.description || ''}</div>
                </div>

                <div className="shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs">
                  {sexLabel(b.sex)}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600">
                {b.seriesId ? <span className="rounded-md bg-neutral-100 px-2 py-1">series: {b.seriesId.slice(0, 6)}</span> : null}
                {typeof b.offspringUnitPrice === 'number' ? (
                  <span className="rounded-md bg-neutral-100 px-2 py-1">¥ {b.offspringUnitPrice}</span>
                ) : null}
                {b.sireCode ? <span className="rounded-md bg-neutral-100 px-2 py-1">父: {b.sireCode}</span> : null}
                {b.damCode ? <span className="rounded-md bg-neutral-100 px-2 py-1">母: {b.damCode}</span> : null}
              </div>
            </Link>
          ))}

          {!breedersQ.isLoading && (breedersQ.data || []).length === 0 ? (
            <div className="rounded-xl border border-neutral-200 p-6 text-sm text-neutral-600">暂无数据</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SeriesFeed;
