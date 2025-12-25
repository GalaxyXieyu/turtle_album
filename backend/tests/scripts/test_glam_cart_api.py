# Auto-generated test module for glam_cart_api
from atf.core.log_manager import log
from atf.core.globals import Globals
from atf.core.variable_resolver import VariableResolver
from atf.core.request_handler import RequestHandler
from atf.core.assert_handler import AssertHandler
import allure
import yaml

@allure.epic('glam_cart_api_test.yaml')
class TestGlamCartApi:
    @classmethod
    def setup_class(cls):
        log.info('========== 开始执行测试用例：test_glam_cart_api (完整的Glam Cart后端API接口测试) ==========')
        cls.test_case_data = cls.load_test_case_data()
        cls.steps_dict = {step['id']: step for step in cls.test_case_data['steps']}
        cls.session_vars = {}
        cls.global_vars = Globals.get_data()
        cls.testcase_host = 'http://localhost:8000'
        cls.VR = VariableResolver(global_vars=cls.global_vars, session_vars=cls.session_vars)
        log.info('Setup completed for TestGlamCartApi')

    @staticmethod
    def load_test_case_data():
        with open(r'/Volumes/DATABASE/code/glam-cart/backend/tests/cases/glam_cart_api_test.yaml', 'r', encoding='utf-8') as file:
            test_case_data = yaml.safe_load(file)['testcase']
        return test_case_data

    @allure.story('glam_cart_api')
    def test_glam_cart_api(self):
        log.info('Starting test_glam_cart_api')
        # Step: health_check
        log.info(f'开始执行 step: health_check')
        health_check = self.steps_dict.get('health_check')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=health_check['method'],
            url=step_host + self.VR.process_data(health_check['path']),
            headers=self.VR.process_data(health_check.get('headers')),
            data=self.VR.process_data(health_check.get('data')),
            params=self.VR.process_data(health_check.get('params')),
            files=self.VR.process_data(health_check.get('files'))
        )
        log.info(f'health_check 请求结果为：{response}')
        self.session_vars['health_check'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(health_check['assert']),
            response=response,
            db_config=db_config
        )

        # Step: public_products_list
        log.info(f'开始执行 step: public_products_list')
        public_products_list = self.steps_dict.get('public_products_list')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=public_products_list['method'],
            url=step_host + self.VR.process_data(public_products_list['path']),
            headers=self.VR.process_data(public_products_list.get('headers')),
            data=self.VR.process_data(public_products_list.get('data')),
            params=self.VR.process_data(public_products_list.get('params')),
            files=self.VR.process_data(public_products_list.get('files'))
        )
        log.info(f'public_products_list 请求结果为：{response}')
        self.session_vars['public_products_list'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(public_products_list['assert']),
            response=response,
            db_config=db_config
        )

        # Step: public_product_detail
        log.info(f'开始执行 step: public_product_detail')
        public_product_detail = self.steps_dict.get('public_product_detail')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=public_product_detail['method'],
            url=step_host + self.VR.process_data(public_product_detail['path']),
            headers=self.VR.process_data(public_product_detail.get('headers')),
            data=self.VR.process_data(public_product_detail.get('data')),
            params=self.VR.process_data(public_product_detail.get('params')),
            files=self.VR.process_data(public_product_detail.get('files'))
        )
        log.info(f'public_product_detail 请求结果为：{response}')
        self.session_vars['public_product_detail'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(public_product_detail['assert']),
            response=response,
            db_config=db_config
        )

        # Step: public_featured_products
        log.info(f'开始执行 step: public_featured_products')
        public_featured_products = self.steps_dict.get('public_featured_products')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=public_featured_products['method'],
            url=step_host + self.VR.process_data(public_featured_products['path']),
            headers=self.VR.process_data(public_featured_products.get('headers')),
            data=self.VR.process_data(public_featured_products.get('data')),
            params=self.VR.process_data(public_featured_products.get('params')),
            files=self.VR.process_data(public_featured_products.get('files'))
        )
        log.info(f'public_featured_products 请求结果为：{response}')
        self.session_vars['public_featured_products'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(public_featured_products['assert']),
            response=response,
            db_config=db_config
        )

        # Step: public_carousels
        log.info(f'开始执行 step: public_carousels')
        public_carousels = self.steps_dict.get('public_carousels')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=public_carousels['method'],
            url=step_host + self.VR.process_data(public_carousels['path']),
            headers=self.VR.process_data(public_carousels.get('headers')),
            data=self.VR.process_data(public_carousels.get('data')),
            params=self.VR.process_data(public_carousels.get('params')),
            files=self.VR.process_data(public_carousels.get('files'))
        )
        log.info(f'public_carousels 请求结果为：{response}')
        self.session_vars['public_carousels'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(public_carousels['assert']),
            response=response,
            db_config=db_config
        )

        # Step: public_settings
        log.info(f'开始执行 step: public_settings')
        public_settings = self.steps_dict.get('public_settings')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=public_settings['method'],
            url=step_host + self.VR.process_data(public_settings['path']),
            headers=self.VR.process_data(public_settings.get('headers')),
            data=self.VR.process_data(public_settings.get('data')),
            params=self.VR.process_data(public_settings.get('params')),
            files=self.VR.process_data(public_settings.get('files'))
        )
        log.info(f'public_settings 请求结果为：{response}')
        self.session_vars['public_settings'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(public_settings['assert']),
            response=response,
            db_config=db_config
        )

        # Step: admin_login
        log.info(f'开始执行 step: admin_login')
        admin_login = self.steps_dict.get('admin_login')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=admin_login['method'],
            url=step_host + self.VR.process_data(admin_login['path']),
            headers=self.VR.process_data(admin_login.get('headers')),
            data=self.VR.process_data(admin_login.get('data')),
            params=self.VR.process_data(admin_login.get('params')),
            files=self.VR.process_data(admin_login.get('files'))
        )
        log.info(f'admin_login 请求结果为：{response}')
        self.session_vars['admin_login'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(admin_login['assert']),
            response=response,
            db_config=db_config
        )


        log.info(f"Test case test_glam_cart_api completed.")
