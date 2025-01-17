import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import FilterData from '../../components/filter/filter.data';
import { MipsService } from '../../services/mips.service';
import { FooterVisibleService } from '../../../../services/footer-visible/footer-visible.service';
import { FilterListComponent } from '../../components/filter-list/filter-list.component';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { FilterItemService } from 'src/app/services/filter-item/filter-item.service';
import { QueryParamsListService } from '../../services/query-params-list.service';
import QueryParams from '../../types/query-params';

@Component({
  selector: 'app-list-page',
  templateUrl: './list-page.component.html',
  styleUrls: ['./list-page.component.scss']
})
export class ListPageComponent implements OnInit, AfterViewInit {

  mips: any = [];
  mipsAux: any = [];
  limit = 10;
  limitAux = 10;
  page = 0;
  order: string;
  search: string = '';
  filter: any;
  filterSaved: FilterData;
  loading: boolean;
  loadingPlus: boolean;
  total: number;
  moreToLoad: boolean;
  mobileSearch = false;
  @ViewChild('filterList', {static: true}) filterList: FilterListComponent;
  showFilterList: boolean = false;
  showListSearch: boolean = false;
  listSearchMip: any[] = [];
  subproposalsMode: boolean;
  mipsByName: any[] = [];
  orderSubproposalField: string = 'subproposal';
  sintaxError: boolean = false;
  errorMessage: string = '';

  constructor(
    private mipsService: MipsService,
    private footerVisibleService: FooterVisibleService,
    private router: Router,
    private filterItemService: FilterItemService,
    private route: ActivatedRoute,
    private queryParamsListService: QueryParamsListService
  ) { }

  ngOnInit(): void {
    this.order = 'mip';
    this.initParametersToLoadData();
    this.loading = true;
    this.searchMips();

    this.mipsService.activateSearch$
    .subscribe(data => {
      if (data) {
        this.onSendPagination();
        this.mipsService.updateActiveSearch(false);
      }
    });

    this.footerVisibleService.isFooterVisible$.subscribe(data => {
      let elementFeedback = document.getElementById('feedback');
      if (data === true && elementFeedback) {
        elementFeedback.style.position = 'relative';
        elementFeedback.style.bottom = window.innerWidth >= 500 ? '0px' : '-10px';
      } else {
        if (elementFeedback) {
          elementFeedback.style.position = 'fixed';
          elementFeedback.style.bottom = '40px';
        }
      }
    });

    this.queryParamsListService.qParams$.subscribe((data: QueryParams) => {
      this.updateUrlQueryParams(data);
    })
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initFiltersList();
    }, 200);
  }

  initParametersToLoadData() {
    this.initQueryParams();
    this.initFiltersAndSearch();
    this.mips = [];
    this.limitAux = 10;
    this.page = 0;
  }

  initQueryParams() {
    let queryParams: any = this.route.snapshot.queryParamMap;

    let status;
    if (queryParams.has("status")) {
      if (typeof queryParams.params.status === "string") {
        (status = []).push(queryParams.params.status);
      } else {
        status = [...queryParams.params.status];
      }
    }

    let qp: QueryParams = {
      status: status ? status : [],
      search: queryParams.params.search ? queryParams.params.search : '',
      subproposalsMode: queryParams.params.subproposalsMode === 'true' ? true : false
    };

    this.queryParamsListService.queryParams = qp;
  }

  initFiltersAndSearch() {
    this.initFiltersStatus();
    this.initSearch();
    this.initSubproposalMode();
  }

  initSearch() {
    let queryParams: QueryParams = this.queryParamsListService.queryParams;
    this.search = queryParams.search;
  }

  initFiltersStatus() {
    if (this.queryParamsListService.queryParams.status) {
      this.queryParamsListService.queryParams.status.forEach((value) => {
        switch (value) {
          case "Accepted":
            this.mipsService.setFilterArrayStatus(0, 1);
            break;
          case "Rejected":
            this.mipsService.setFilterArrayStatus(1, 1);
            break;
          case "Archive":
            this.mipsService.setFilterArrayStatus(2, 1);
            break;
          case "RFC":
            this.mipsService.setFilterArrayStatus(3, 1);
            break;
          case "Obsolete":
            this.mipsService.setFilterArrayStatus(4, 1);
            break;
          case "Formal Submission":
            this.mipsService.setFilterArrayStatus(5, 1);
            break;
          default:
            break;
        }
      });
    }

    this.filter = {
      contains: [],
      notcontains: [],
      equals: [],
      notequals: [],
      inarray: []
    };

    this.filter.notequals.push({field: 'mip', value: -1});

    this.setFiltersStatus();

  }

  initSubproposalMode() {
    this.setSubproposalMode(this.queryParamsListService.queryParams.subproposalsMode);
  }

  setFiltersStatus() {
    let filter = {...this.filter};

    this.filterSaved = this.mipsService.getFilter();

    if (this.filterSaved.arrayStatus[0] === 1) {
      this.pushFilterInarray(filter.inarray, {field: 'status', value: 'Accepted' });
    } else {
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Accepted'});
    }
    if (this.filterSaved.arrayStatus[1] === 1) {
      this.pushFilterInarray(filter.inarray, {field: 'status', value: 'Rejected' });
    } else {
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Rejected'});
    }
    if (this.filterSaved.arrayStatus[2] === 1) {
      this.pushFilterInarray(filter.inarray, {field: 'status', value: 'Archive' });
    } else {
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Archive'});
    }
    if (this.filterSaved.arrayStatus[3] === 1) {
      this.pushFilterInarray(filter.inarray, {field: 'status', value: 'RFC' });
      this.pushFilterInarray(filter.inarray, {field: 'status', value: "Request for Comments (RFC)" });
      this.pushFilterInarray(filter.inarray, {field: 'status', value: "Request for Comments" });
    } else {
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'RFC'});
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Request for Comments (RFC)'});
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Request for Comments'});
    }
    if (this.filterSaved.arrayStatus[4] === 1) {
      this.pushFilterInarray(filter.inarray, {field: 'status', value: 'Obsolete' });
    } else {
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Obsolete'});
    }
    if (this.filterSaved.arrayStatus[5] === 1) {
      this.pushFilterInarray(filter.inarray, {field: 'status', value: 'Formal Submission' });
      this.pushFilterInarray(filter.inarray, {field: 'status', value: "Formal Submission (FS)" });
    } else {
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Formal Submission'});
      this.deleteFilterInarray(filter.inarray, {field: 'status', value: 'Formal Submission (FS)'});
    }

    this.filter = {...filter};
  }

  pushFilterInarray(array: Array<any>, data: any) {
    let item = array.find(i => i.field === data.field && i.value === data.value);

    if (!item) {
      array.push(data);
    }
  }

  deleteFilterInarray(array: Array<any>, data: any) {
    let index = array.findIndex(i => i.field === data.field && i.value === data.value);

    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  searchMips(): void {
    this.mipsService.searchMips(this.limit, this.page, this.order, this.search, this.filter, 'title proposal filename mipName paragraphSummary sentenceSummary mip status')
    .subscribe(data => {
      this.mipsAux = data.items;
      this.mips = this.mips.concat(this.mipsAux);
      this.mipsService.setMipsData(this.mips);
      this.total = data.total;
      this.mipsService.setTotal(this.total);
      this.loading = false;
      this.loadingPlus = false;

      if (this.limitAux >= this.total) {
         this.moreToLoad = false;
      } else {
         this.moreToLoad = true;
      }

      this.sintaxError = false;
      this.errorMessage = "";
    }, error => {
      if (
        error.error &&
        error.error.error &&
        ((error.error.error as string).includes('Parse error') ||
          (error.error.error as string).includes('Lexical error'))
      ) {
        this.sintaxError = true;
        this.errorMessage = 'Sintax error.';
      } else {
        this.sintaxError = false;
        this.errorMessage = '';
      }
    });
  }

  searchMipsByName(limit, page, order, search, filter): void {
    this.mipsService.searchMips(limit, page, order, search, filter, 'title proposal mipName filename paragraphSummary sentenceSummary mip status')
    .subscribe(data => {
      this.mipsByName = data.items;

      this.showListSearch = true;
      this.listSearchMip = this.mipsByName.map(item => {
        return {
          content: item.mipName + " " + (item.title !== undefined ? item.title : ""),
          mipName: item.mipName,
          id: item._id
        }
      });
    });
}

  onSendPagination(): void {
      this.loadingPlus = true;
      this.page++;
      this.limitAux += 10;
      if (this.moreToLoad) {
        this.searchMips();
      }
  }

  onSendFilters() {
    this.setFiltersStatus();
    this.mips = [];
    this.limitAux = 10;
    this.page = 0;
    this.loading = true;
    this.searchMips();
    this.setQueryParams();
  }

  onSendSearch(event: any): void {
    let search = event.target.value.toLowerCase().trim();

    if (search.startsWith('mip')) {
      if (event.keyCode == 13 && this.listSearchMip.length > 0) {
        this.goToMipDetails(this.listSearchMip[0].mipName);
      }
      let filter = {
        contains: [],
      };
      filter.contains.push({field: 'mipName', value: event.target.value});
      this.searchMipsByName(0, 0, 'mipName', '', filter);
      this.limit = 0;
    } else {
      this.listSearchMip = [];
      this.limitAux = 10;
      this.mips = [];
      this.page = 0;
      this.search = event.target.value;
      this.loading = true;
      this.searchMips();
      this.setQueryParams();
    }
  }

  onSendOrder(text: string): void {
    this.mips = [];
    this.limitAux = 10;
    this.page = 0;
    this.order = (this.subproposalsMode && text === 'mip') ? text + " " + this.orderSubproposalField : text;
    this.loading = true;
    this.searchMips();
  }

  onOpenMobileSearch(open: boolean): void {
    this.mobileSearch = open;
  }

  cmpFn(o1: any, o2: any): boolean {
    return o1.id === o2.id;
  }

  onCloseFilterItem(event) {
    this.mipsService.setFilterArrayStatus(parseInt(event), 0);
    this.setFiltersStatus();
    this.onSendFilters();
  }

  onHasItemsFilterList(event) {
    this.showFilterList = event;
  }

  onNavigateToMipDetails(event) {
    this.goToMipDetails(event.mipName);
  }

  goToMipDetails(name) {
    this.router.navigate(["/mips/details/", name]);
  }

  onCheckedSubproposalMode(event) {
    this.setSubproposalMode(event);
    this.mips = [];
    this.page = 0;
    this.limitAux = 10;
    this.setQueryParams();
    this.loading = true;
    this.searchMips();
  }

  setSubproposalMode(value) {
    this.order =
      value && this.order === "mip"
        ? this.order + " " + this.orderSubproposalField
        : this.order.replace(this.orderSubproposalField, "").trim();
    this.subproposalsMode = value;

    if (!this.subproposalsMode) {
      this.filter.equals.push({field: 'proposal', value: ""});
    } else {
      let index = this.filter.equals.findIndex(item => item.field === 'proposal');

      if (index !== -1) {
        this.filter.equals.splice(index, 1);
      }
    }
  }

  initFiltersList(): void {
    let filterSaved = this.mipsService.getFilter();
    let sum = filterSaved.arrayStatus.reduce((t, c) => t + c, 0);
    this.showFilterList = sum ? true : false;

    if (filterSaved.arrayStatus[0] === 1) {
      this.filterItemService.add({
        id: '0',
        text: 'accepted',
        value: '0',
        color: '#27AE60'
      });
    }
    if (filterSaved.arrayStatus[1] === 1) {
      this.filterItemService.add({
        id: '1',
        text: 'rejected',
        value: '1',
        color: '#EB5757'
      });
    }
    if (filterSaved.arrayStatus[2] === 1) {
      this.filterItemService.add({
        id: '2',
        text: 'archive',
        value: '2',
        color: '#748AA1'
      });
    }
    if (filterSaved.arrayStatus[3] === 1) {
      this.filterItemService.add({
        id: '3',
        text: 'rfc',
        value: '3',
        color: '#F2994A'
      });
    }
    if (filterSaved.arrayStatus[4] === 1) {
      this.filterItemService.add({
        id: '4',
        text: 'obsolete',
        value: '4',
        color: '#B5B12A'
      });
    }
    if (filterSaved.arrayStatus[5] === 1) {
      this.filterItemService.add({
        id: '5',
        text: 'formal submission',
        value: '5',
        color: '#78288C'
      });
    }
  }

  setQueryParams() {
    this.queryParamsListService.clearStatus();

    let filterSaved = this.mipsService.getFilter();

    let qp: QueryParams = {
      status: [],
      search: this.search,
      subproposalsMode: this.subproposalsMode
    };

    if (filterSaved.arrayStatus[0] === 1) {
      qp.status.push('Accepted');
    }
    if (filterSaved.arrayStatus[1] === 1) {
      qp.status.push('Rejected');
    }
    if (filterSaved.arrayStatus[2] === 1) {
      qp.status.push('Archive');
    }
    if (filterSaved.arrayStatus[3] === 1) {
      qp.status.push('RFC');
    }
    if (filterSaved.arrayStatus[4] === 1) {
      qp.status.push('Obsolete');
    }
    if (filterSaved.arrayStatus[5] === 1) {
      qp.status.push('Formal Submission');
    }

    this.queryParamsListService.queryParams = qp;
  }

  updateUrlQueryParams(qp: QueryParams) {
    let navigationExtras: NavigationExtras = {
      queryParams: qp
    }

    this.router.navigate(['/mips/list'], {...navigationExtras});
  }
}
