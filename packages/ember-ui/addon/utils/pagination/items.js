import EmberObject, { computed } from '@ember/object';
import PaginationTruncatePages from './truncate-pages';
import { A } from '@ember/array';
import getInt from '../get-int';

export default class PaginationItems extends EmberObject {
    /**
     * Gets all the page items
     *
     * @var {Array}
     */
    @computed('currentPage', 'totalPages') get pageItemsAll() {
        const currentPage = getInt(this, 'currentPage');
        const totalPages = getInt(this, 'totalPages');

        let res = A();

        for (let i = 1; i <= totalPages; i++) {
            res.push({
                page: i,
                current: currentPage === i,
                dots: false,
            });
        }
        return res;
    }

    /**
     * Returns the truncated version of the page items
     *
     * @var {Array}
     */
    @computed('currentPage', 'totalPages', 'numPagesToShow', 'showFL')
    get pageItemsTruncated() {
        const currentPage = getInt(this, 'currentPage');
        const totalPages = getInt(this, 'totalPages');
        const numPagesToShow = getInt(this, 'numPagesToShow');
        const showFL = this.showFL;
        const truncatedPageItems = PaginationTruncatePages.create({
            currentPage,
            totalPages,
            numPagesToShow,
            showFL,
        });
        const pages = truncatedPageItems.pagesToShow;
        let next = pages[0];

        return pages.map(function (page) {
            var h = {
                page: page,
                current: currentPage === page,
                dots: next !== page,
            };
            next = page + 1;
            return h;
        });
    }

    @computed('currentPage', 'numPagesToShow', 'pageItemsAll', 'pageItemsTruncated', 'totalPages', 'truncatePages')
    get pageItems() {
        if (this.truncatePages) {
            return this.pageItemsTruncated;
        } else {
            return this.pageItemsAll;
        }
    }
}
