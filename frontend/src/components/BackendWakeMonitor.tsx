/**
 * 后端唤醒提示（无页面 UI，只负责通知）：
 * - 订阅全局 backendWake 状态；
 * - 首次进入后端正常 → 静默不提示；
 * - 首次失败 → 显示「正在唤醒」持续提示，轮询恢复后显示一次「已就绪」；
 * - 超时 → 显示「暂时无法连接」。
 *
 * 挂载在 main.tsx 的 Provider 树中，全局只运行一次。
 */
import { backendWake, type WakeState } from '@/lib/backendWake';
import { useI18n } from '@/i18n';
import { notification } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useEffect, useRef, useSyncExternalStore } from 'react';

const KEY = 'backend-wake';

export function BackendWakeMonitor() {
  const state = useSyncExternalStore(backendWake.subscribe, backendWake.getState, backendWake.getState);
  const [api, holder] = notification.useNotification();
  const { t } = useI18n();
  /** 是否经历过唤醒（决定恢复时是否提示，避免后端本来就正常时打扰用户） */
  const woke = useRef(false);

  useEffect(() => {
    void backendWake.init();
  }, []);

  useEffect(() => {
    const s: WakeState = state;
    if (s === 'waking') {
      woke.current = true;
      api.open({
        key: KEY,
        icon: <LoadingOutlined style={{ color: '#1772b4' }} />,
        duration: 0,
        message: t('wake.waking.title'),
        description: t('wake.waking.desc'),
      });
    } else if (s === 'ok') {
      if (woke.current) {
        api.success({
          key: KEY,
          duration: 4,
          message: t('wake.ok.title'),
          description: t('wake.ok.desc'),
        });
        woke.current = false;
      }
    } else if (s === 'failed') {
      api.error({
        key: KEY,
        duration: 8,
        message: t('wake.failed.title'),
        description: t('wake.failed.desc'),
      });
      woke.current = false;
    }
  }, [state, api, t]);

  return holder;
}
