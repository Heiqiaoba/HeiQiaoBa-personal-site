/**
 * 占位页：为 /notes、/projects、/about 提供可访问的骨架页面。
 * 后续逐个替换为真实内容页面，所有文案走 i18n。
 */
import { useI18n, type DictKey } from '@/i18n';
import { Button, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Paragraph } = Typography;

export function Placeholder({ titleKey }: { titleKey: DictKey }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16">
      <Title level={2}>{t(titleKey)}</Title>
      <Paragraph type="secondary">{t('home.placeholder')}</Paragraph>
      <Link to="/">
        <Button type="link" className="!px-0">
          ← {t('notfound.back')}
        </Button>
      </Link>
    </div>
  );
}
