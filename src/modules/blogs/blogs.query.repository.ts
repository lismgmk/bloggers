import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { IPaginationResponse } from '../../global-dto/common-interfaces';
import { paginationDefaultBuilder } from '../../helpers/pagination-default-builder';
import { Blog } from '../../schemas/blog.schema';
import { IAllBlogsSaResponse } from '../sa/types_dto/response_interfaces/all-blogs-sa.response';
import { ICondition } from './instance_dto/dto_transfer/condition-interface';
import { GetAllBlogsQueryMain } from './instance_dto/main_instance/get-all-blogs.instance';

@Injectable()
export class BlogsQueryRepository {
  constructor(@InjectModel(Blog.name) private blogModel: Model<Blog>) {}
  async queryAllBlogsPagination(queryParams: GetAllBlogsQueryMain) {
    const sortField = queryParams.sortBy;
    let sortValue: string | 1 | -1 = -1;
    if (queryParams.sortDirection === 'desc') {
      sortValue = -1;
    }
    if (queryParams.sortDirection === 'asc') {
      sortValue = 1;
    }
    const namePart = new RegExp(queryParams.searchNameTerm, 'i');

    const singleCondition = { name: namePart };
    return this.agregateFindBlogs(
      queryParams,
      singleCondition,
      sortField,
      sortValue,
    );
  }

  async queryAllBlogsForUserPagination(
    queryParams: GetAllBlogsQueryMain,
    userId: string | ObjectId,
  ) {
    const sortField = queryParams.sortBy;
    let sortValue: string | 1 | -1 = -1;
    if (queryParams.sortDirection === 'desc') {
      sortValue = -1;
    }
    if (queryParams.sortDirection === 'asc') {
      sortValue = 1;
    }
    const namePart = new RegExp(queryParams.searchNameTerm, 'i');

    const singleCondition = { name: namePart, userId };

    return this.agregateFindBlogs(
      queryParams,
      singleCondition,
      sortField,
      sortValue,
    );
  }

  async agregateFindBlogs(
    queryParams: GetAllBlogsQueryMain,
    singleCondition: ICondition,
    sortField: string,
    sortValue: 1 | -1,
  ) {
    const result = (
      await this.blogModel
        .aggregate([
          {
            $match: singleCondition,
          },
          {
            $sort: {
              [sortField]: sortValue,
            },
          },
          { $setWindowFields: { output: { totalCount: { $count: {} } } } },
          {
            $skip:
              queryParams.pageNumber > 0
                ? (queryParams.pageNumber - 1) * queryParams.pageSize
                : 0,
          },
          { $limit: queryParams.pageSize },
          {
            $project: {
              _id: 0,
              total: '$totalCount',
              id: '$_id',
              name: '$name',
              websiteUrl: '$websiteUrl',
              description: '$description',
              createdAt: '$createdAt',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: 'id',
              as: 'blogOwnerInfo',
              pipeline: [
                {
                  $project: {
                    _id: 0,
                    userId: '$_id',
                    userLogin: '$accountData.userName',
                  },
                },
              ],
            },
          },
          {
            $set: {
              blogOwnerInfo: {
                $first: '$blogOwnerInfo',
              },
            },
          },
          {
            $group: {
              _id: sortField,
              page: { $first: queryParams.pageNumber },
              pageSize: { $first: queryParams.pageSize },
              totalCount: { $first: '$$ROOT.total' },
              pagesCount: {
                $first: {
                  $ceil: [{ $divide: ['$$ROOT.total', queryParams.pageSize] }],
                },
              },
              items: { $push: '$$ROOT' },
            },
          },
          {
            $unset: ['_id', 'items.total'],
          },
        ])
        .exec()
    )[0] as IPaginationResponse<IAllBlogsSaResponse[]>;
    return (
      result ||
      paginationDefaultBuilder({
        pageSize: queryParams.pageSize,
        pageNumber: queryParams.pageNumber,
      })
    );
  }
}
