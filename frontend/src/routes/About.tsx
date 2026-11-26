/**
 * 关于页：静态中英双语内容（从 i18n 字典读取），深浅主题适配。
 */
import { useI18n } from '@/i18n';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export function About() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[720px] px-6 py-14">
      <Title level={1} className="!text-[2.2rem]">{t('about.title')}</Title>
      <Paragraph className="!text-lg !leading-[1.9] !text-[color:var(--text)]">
        {t('about.intro')}
      </Paragraph>
      <div className="mt-8 space-y-5 !leading-[1.9] text-[color:var(--text-secondary)]">
        <Paragraph>{t('about.p1')}</Paragraph>
        <Paragraph>{t('about.p2')}</Paragraph>
        <Paragraph>{t('about.p3')}</Paragraph>
      </div>
      <div className="mt-10 border-t border-[color:var(--border)] pt-6">
        <Title level={4}>{t('about.contact')}</Title>
        <Paragraph type="secondary">GitHub · Heiqiaoba</Paragraph>
      </div>
    </div>
  );
}
