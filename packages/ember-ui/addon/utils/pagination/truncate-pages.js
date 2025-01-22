import EmberObject, { computed } from '@ember/object';
import { A } from '@ember/array';
import getInt from '../get-int';

export default class PaginationTruncatePages extends EmberObject {
    /**
     * Checks if given page is valid or matches with meta
     *
     * @param {Integer} page
     * @return {Boolean}
     */
    isValidPage(page) {
        page = parseInt(page);
        return page > 0 && page <= parseInt(this.totalPages);
    }

    /**
     * An array of pages to display at a time
     *
     * @var {Array}
     */
    @computed('currentPage', 'numPagesToShow', 'showFL', 'totalPages')
    get pagesToShow() {
        var res = [];

        var numPagesToShow = getInt(this, 'numPagesToShow');
        var currentPage = getInt(this, 'currentPage');
        var totalPages = getInt(this, 'totalPages');
        var showFL = this.showFL;

        var before = parseInt(numPagesToShow / 2);
        if (currentPage - before < 1) {
            before = currentPage - 1;
        }
        var after = numPagesToShow - before - 1;
        if (totalPages - currentPage < after) {
            after = totalPages - currentPage;
            before = numPagesToShow - after - 1;
        }

        // add one page if no first or last is added
        if (showFL) {
            if (currentPage - before < 2) {
                after++;
            }
            if (totalPages - currentPage - 1 < after) {
                before++;
            }
        }

        // add each prior page
        for (var i = before; i > 0; i--) {
            var possiblePage = currentPage - i;
            if (this.isValidPage(possiblePage)) {
                res.push(possiblePage);
            }
        }

        res.push(currentPage);

        // add each following page
        for (i = 1; i <= after; i++) {
            var possiblePage2 = currentPage + i;
            if (this.isValidPage(possiblePage2)) {
                res.push(possiblePage2);
            }
        }

        // add first and last page
        if (showFL) {
            if (res.length > 0) {
                // add first page if not already there
                if (res[0] !== 1) {
                    res = [1].concat(res);
                }

                // add last page if not already there
                if (res[res.length - 1] !== totalPages) {
                    res.push(totalPages);
                }
            }
        }

        return A(res);
    }
}
