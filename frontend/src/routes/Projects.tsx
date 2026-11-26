/**
 * 项目页：静态中英双语内容（从 i18n 字典读取）。
 */
import { useI18n } from '@/i18n';
import { Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

const projects = [
  { name: 'projects.p1.name', desc: 'projects.p1.desc', stack: 'projects.p1.stack', icon: '✦' },
  { name: 'projects.p2.name', desc: 'projects.p2.desc', stack: 'projects.p2.stack', icon: '◈' },
  { name: 'projects.p3.name', desc: 'projects.p3.desc', stack: 'projects.p3.stack', icon: '❋' },
] as const;

export function Projects() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <Title level={1} className="!text-[2.2rem]">{t('projects.title')}</Title>
      <Paragraph type="secondary" className="!mb-10">{t('projects.intro')}</Paragraph>
      <div className="space-y-5">
        {projects.map((p) => (
          <div key={p.name} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-soft)] text-xl text-[color:var(--brand)]">
                {p.icon}
              </span>
              <div className="min-w-0">
                <Title level={4} className="!mb-2 !text-[color:var(--text)]">{t(p.name)}</Title>
                <Paragraph className="!mb-3 !leading-[1.8] !text-[color:var(--text-secondary)]">{t(p.desc)}</Paragraph>
                <Text className="!text-xs !text-[color:var(--text-muted)]">{t(p.stack)}</Text>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
