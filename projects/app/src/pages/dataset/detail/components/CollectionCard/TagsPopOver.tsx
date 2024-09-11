import { Box, Checkbox, Flex, Input } from '@chakra-ui/react';
import MyPopover from '@fastgpt/web/components/common/MyPopover';
import MyIcon from '@fastgpt/web/components/common/Icon';
import MyBox from '@fastgpt/web/components/common/MyBox';
import { postCreateDatasetCollectionTag2, putDatasetCollectionById } from '@/web/core/dataset/api';
import { useContextSelector } from 'use-context-selector';
import { DatasetPageContext } from '@/web/core/dataset/context/datasetPageContext';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDeepCompareEffect } from 'ahooks';
import { DatasetCollectionItemType, DatasetTagType } from '@fastgpt/global/core/dataset/type';
import { isEqual } from 'lodash';
import { DatasetCollectionsListItemType } from '@/global/core/dataset/type';

const TagsPopOver = ({
  currentCollection
}: {
  currentCollection: DatasetCollectionItemType | DatasetCollectionsListItemType;
}) => {
  const { t } = useTranslation();
  const {
    datasetDetail,
    searchTagKey,
    setSearchTagKey,
    searchDatasetTagsResult,
    allDatasetTags,
    onCreateCollectionTag,
    isCreateCollectionTagLoading
  } = useContextSelector(DatasetPageContext, (v) => v);

  const [collectionTags, setCollectionTags] = useState<string[]>(currentCollection.tags ?? []);
  const [checkedTags, setCheckedTags] = useState<DatasetTagType[]>([]);
  const [showTagManage, setShowTagManage] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  useEffect(() => {
    if (!currentCollection.tags) return;
    setCollectionTags(currentCollection.tags);
  }, [currentCollection]);

  const tagList = useMemo(
    () =>
      (collectionTags
        ?.map((tagId) => {
          const tagObject = allDatasetTags.find((tag) => tag._id === tagId);
          return tagObject ? { _id: tagObject._id, tag: tagObject.tag } : null;
        })
        .filter((tag) => tag !== null) as {
        _id: string;
        tag: string;
      }[]) || [],
    [collectionTags, allDatasetTags]
  );

  const [visibleTags, setVisibleTags] = useState<DatasetTagType[]>(tagList);
  const [overflowTags, setOverflowTags] = useState<DatasetTagType[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useDeepCompareEffect(() => {
    const calculateTags = () => {
      if (!containerRef.current || !tagList) return;

      const containerWidth = containerRef.current.offsetWidth;
      const tagWidth = 11;
      let totalWidth = 30;
      let visibleCount = 0;

      for (let i = 0; i < tagList.length; i++) {
        const tag = tagList[i];
        const estimatedWidth = tag.tag.length * tagWidth + 16; // 加上左右 padding 的宽度
        if (totalWidth + estimatedWidth <= containerWidth) {
          totalWidth += estimatedWidth;
          visibleCount++;
        } else {
          break;
        }
      }

      setVisibleTags(tagList.slice(0, visibleCount));
      setOverflowTags(tagList.slice(visibleCount));
    };

    setTimeout(calculateTags, 100);
    setCheckedTags(tagList);

    window.addEventListener('resize', calculateTags);

    return () => {
      window.removeEventListener('resize', calculateTags);
    };
  }, [tagList]);

  // const { mutate: onCreateCollectionTag, isLoading: isCreateCollectionTagLoading } = useRequest({
  //   mutationFn: async (tag: string) => {
  //     const id = await postCreateDatasetCollectionTag({
  //       datasetId: datasetDetail._id,
  //       tag
  //     });
  //     return id;
  //   },

  //   onSuccess() {
  //     //loadDatasetTags({ id: datasetDetail._id, searchKey: '' });
  //     loadAllDatasetTags(datasetDetail._id);
  //   },
  //   successToast: t('common:common.Create Success'),
  //   errorToast: t('common:common.Create Failed')
  // });

  return (
    <MyPopover
      placement={showTagManage ? 'bottom' : 'bottom-end'}
      hasArrow={false}
      offset={[2, 2]}
      w={'180px'}
      trigger={'hover'}
      Trigger={
        <MyBox
          ref={containerRef}
          display={'flex'}
          isLoading={isUpdateLoading}
          size={'xs'}
          mt={1}
          py={0.5}
          px={0.25}
          _hover={{
            bg: 'myGray.50',
            borderRadius: '3px'
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            if (!e.currentTarget.parentElement || !e.currentTarget.parentElement.parentElement)
              return;
            e.currentTarget.parentElement.parentElement.style.backgroundColor = 'white';
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.parentElement || !e.currentTarget.parentElement.parentElement)
              return;
            e.currentTarget.parentElement.parentElement.style.backgroundColor = '';
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowTagManage(true);
          }}
          cursor={'pointer'}
        >
          <Flex>
            <Box
              key={'whoareyou'}
              h={5}
              mr={2}
              px={2}
              fontSize={'11px'}
              fontWeight={'500'}
              bg={'#F0FBFF'}
              color={'#0884DD'}
              borderRadius={'xs'}
            >
              +标签
            </Box>
            {visibleTags.map((item, index) => (
              <Box
                key={index}
                h={5}
                mr={2}
                px={2}
                fontSize={'11px'}
                fontWeight={'500'}
                bg={'#F0FBFF'}
                color={'#0884DD'}
                borderRadius={'xs'}
              >
                {item.tag}
              </Box>
            ))}
          </Flex>
          {overflowTags.length > 0 && (
            <Box h={5} px={2} bg={'#1118240D'} borderRadius={'33px'} fontSize={'11px'}>
              {`+${overflowTags.length}`}
            </Box>
          )}
        </MyBox>
      }
      onCloseFunc={async () => {
        setShowTagManage(false);
        if (isEqual(checkedTags, tagList) || !showTagManage) return;
        setIsUpdateLoading(true);
        await putDatasetCollectionById({
          id: currentCollection._id,
          tags: checkedTags.map((tag) => tag._id)
        });
        await postCreateDatasetCollectionTag2({
          teamId: datasetDetail.teamId,
          datasetId: datasetDetail._id,
          tags: checkedTags
        });
        setCollectionTags(checkedTags.map((tag) => tag._id));
        setIsUpdateLoading(false);
      }}
      display={showTagManage || overflowTags.length > 0 ? 'block' : 'none'}
    >
      {({}) => (
        <>
          {showTagManage ? (
            <MyBox isLoading={false} onClick={(e) => e.stopPropagation()}>
              {/* <Box px={1.5} pt={1.5}>
                <Input
                  pl={2}
                  h={7}
                  borderRadius={'xs'}
                  value={searchTagKey}
                  placeholder={t('dataset:tag.searchOrAddTag')}
                  onChange={(e) => setSearchTagKey(e.target.value)}
                />
              </Box> */}
              <Box my={1} px={1.5} maxH={'200px'} overflow={'auto'}>
                {allDatasetTags?.map((item) => {
                  const tagsList = checkedTags.map((tag) => tag.tag);
                  return (
                    <Flex
                      alignItems={'center'}
                      fontSize={'xs'}
                      px={1}
                      py={1}
                      my={1}
                      key={item._id}
                      cursor={'pointer'}
                      color={tagsList.includes(item.tag) ? '#2B5FD9' : 'myGray.600'}
                      _hover={{
                        bg: '#1118240D',
                        color: '#2B5FD9',
                        ...(tagsList.includes(item.tag) ? {} : { svg: { color: '#F3F3F4' } })
                      }}
                      borderRadius={'xs'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (tagsList.includes(item.tag)) {
                          setCheckedTags(checkedTags.filter((t) => t.tag !== item.tag));
                        } else {
                          setCheckedTags([...checkedTags, item]);
                        }
                      }}
                    >
                      <Checkbox
                        isChecked={tagsList.includes(item.tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCheckedTags([...checkedTags, item]);
                          } else {
                            setCheckedTags(checkedTags.filter((t) => t._id !== item._id));
                          }
                        }}
                        icon={<MyIcon name={'common/check'} w={'12px'} />}
                      />
                      <Box ml={2}>{item.tag}</Box>
                    </Flex>
                  );
                })}
              </Box>
            </MyBox>
          ) : (
            <Flex gap={1} p={3} flexWrap={'wrap'}>
              {overflowTags.map((tag, index) => (
                <Box
                  key={index}
                  h={5}
                  px={2}
                  fontSize={'11px'}
                  bg={'#F0FBFF'}
                  color={'#0884DD'}
                  borderRadius={'xs'}
                >
                  {tag.tag}
                </Box>
              ))}
            </Flex>
          )}
        </>
      )}
    </MyPopover>
  );
};

export default TagsPopOver;
