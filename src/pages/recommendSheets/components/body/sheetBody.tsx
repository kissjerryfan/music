import React, {memo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import rpx from '@/utils/rpx';
import globalStyle from '@/constants/globalStyle';
import {ScrollView} from 'react-native-gesture-handler';
import TypeTag from '../../../../components/base/typeTag';
import usePanel from '@/components/panels/usePanel';
import useRecommendList from '../../hooks/useRecommendListTags';
import SheetList from './sheetList';

interface IProps {
    hash: string;
}

const defaultTag: ICommon.IUnique = {
    title: '默认',
    id: '',
};
function SheetBody(props: IProps) {
    const {hash} = props;

    // 选中的tag
    const [selectedTag, setSelectedTag] = useState<ICommon.IUnique>(defaultTag);

    // 第一个tag
    const [firstTag, setFirstTag] = useState<ICommon.IUnique>(defaultTag);

    // 所有tag
    const tags = useRecommendList(hash);

    const {showPanel, hidePanel} = usePanel();

    return (
        <View style={globalStyle.fwflex1}>
            <ScrollView
                style={style.headerWrapper}
                contentContainerStyle={style.header}
                horizontal>
                <TypeTag
                    title={firstTag.title}
                    selected={selectedTag.id === firstTag.id}
                    onPress={() => {
                        // 拉起浮层
                        showPanel('SheetTags', {
                            tags: tags?.data ?? [],
                            onTagPressed(tag) {
                                setSelectedTag(tag);
                                setFirstTag(tag);
                                hidePanel();
                            },
                        });
                    }}
                />
                {(tags?.pinned ?? []).map(_ => (
                    <TypeTag
                        key={`pinned-${_.id}`}
                        title={_.title}
                        selected={selectedTag.id === _.id}
                        onPress={() => {
                            setSelectedTag(_);
                        }}
                    />
                ))}
            </ScrollView>
            <SheetList tag={selectedTag} pluginHash={hash} />
        </View>
    );
}

export default memo(SheetBody, (prev, curr) => prev.hash === curr.hash);

const style = StyleSheet.create({
    headerWrapper: {
        height: rpx(100),
        flexGrow: 0,
    },
    header: {
        height: rpx(100),
        alignItems: 'center',
    },
});
