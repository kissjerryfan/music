/**
 * 歌单管理
 */
import produce from 'immer';
import {nanoid} from 'nanoid';
import {
    getMultiStorage,
    getStorage,
    removeStorage,
    setStorage,
} from '@/utils/storage';
import {StorageKeys} from '@/constants/commonConst';
import objectPath from 'object-path';
import PluginManager from './pluginManager';

// pluginname - tablekey
let mediaMetaKeys: Record<string, string> = {};
// pluginname - id - mediameta
let mediaMetas: Record<string, Record<string, ICommon.IMediaMeta>> = {};

async function setup() {
    const metaKeys = (await getStorage(StorageKeys.MediaMetaKeys)) ?? {};
    if (!metaKeys) {
        await setStorage(StorageKeys.MediaMetaKeys, {});
    }
    const kv: [string, string][] = Object.entries(metaKeys);
    const metas = await getMultiStorage(kv.map(_ => _[1]));
    const newMediaMetas: Record<string, Record<string, any>> = {};
    metas.forEach((value, index) => {
        newMediaMetas[kv[index][0]] = value ?? {};
    });
    mediaMetas = newMediaMetas;
    // todo： setup时校验一下，清空冗余数据
}

function getMediaMeta(mediaItem: ICommon.IMediaBase) {
    return mediaMetas[mediaItem.platform]?.[mediaItem.id] ?? null;
}

function getByMediaKey(mediaKey: string) {
    const [platform, id] = mediaKey.split('@');
    return getMediaMeta({platform, id});
}

/** 卸载插件时需要删除meta信息 */
async function removeMediaMeta(pluginName: string) {
    const idKey = mediaMetaKeys[pluginName];
    if (!idKey) {
        return;
    }
    try {
        await removeStorage(idKey);
        mediaMetas = produce(mediaMetas, draft => {
            delete draft[idKey];
        });
        delete mediaMetaKeys[pluginName];
        await setStorage(StorageKeys.MediaMetaKeys, mediaMetaKeys);
    } catch {}
}

/** 创建/更新mediameta */
async function updateMediaMeta(
    mediaItem: ICommon.IMediaBase,
    patch?: Record<string, any> | Array<[string, any]>,
) {
    const {platform, id} = mediaItem;
    let newMetas = mediaMetas;
    // 创建一个新的表
    if (!mediaMetaKeys[platform] || !mediaMetas[platform]) {
        const newkey = nanoid();
        mediaMetaKeys[platform] = newkey;
        await setStorage(StorageKeys.MediaMetaKeys, mediaMetaKeys);
        newMetas = produce(newMetas, _ => {
            _[platform] = {};
        });
    }
    if (!newMetas[platform][id]) {
        // 如果没保存过，自动保存主键
        const primaryKey = PluginManager.getByMedia(mediaItem)?.instance
            ?.primaryKey ?? ['id'];
        const mediaData: Record<string, any> = {};
        for (let k of primaryKey) {
            mediaData[k] = mediaItem[k];
        }
        newMetas = produce(newMetas, _ => {
            _[platform][id] = mediaData;
        });
    }
    if (Array.isArray(patch)) {
        newMetas = produce(newMetas, draft => {
            patch.forEach(([pathName, value]) => {
                objectPath.set(draft, `${platform}.${id}.${pathName}`, value);
            });
            return draft;
        });
    } else {
        const _patch = patch ?? mediaItem;
        newMetas = produce(newMetas, draft => {
            const pluginMeta = mediaMetas[platform] ?? {};
            if (!draft[platform]) {
                draft[platform] = {};
            }
            if (pluginMeta[id]) {
                draft[platform][id] = {...pluginMeta[id], ..._patch};
            } else {
                draft[platform][id] = _patch;
            }
        });
    }
    setStorage(mediaMetaKeys[platform], newMetas[platform]);
    mediaMetas = newMetas;
    if (__DEV__) {
        console.log('META UPDATE', mediaMetas);
    }
}

const MediaMeta = {
    setup,
    get: getMediaMeta,
    getByMediaKey,
    update: updateMediaMeta,
    removePlugin: removeMediaMeta,
};

export default MediaMeta;
