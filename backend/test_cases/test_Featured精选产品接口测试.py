# Auto-generated test module for Featured精选产品接口测试
from atf.core.log_manager import log
from atf.core.globals import Globals
from atf.core.variable_resolver import VariableResolver
from atf.core.request_handler import RequestHandler
from atf.core.assert_handler import AssertHandler
import allure
import yaml

@allure.epic('integration_featured.yaml')
class TestFeatured精选产品接口测试:
    @classmethod
    def setup_class(cls):
        log.info('========== 开始执行测试用例：test_Featured精选产品接口测试 (测试精选产品管理接口) ==========')
        cls.test_case_data = cls.load_test_case_data()
        cls.steps_dict = {step['id']: step for step in cls.test_case_data['steps']}
        cls.session_vars = {}
        cls.global_vars = Globals.get_data()
        cls.VR = VariableResolver(global_vars=cls.global_vars, session_vars=cls.session_vars)
        log.info('Setup completed for TestFeatured精选产品接口测试')

    @staticmethod
    def load_test_case_data():
        with open(r'tests/integration_featured.yaml', 'r', encoding='utf-8') as file:
            test_case_data = yaml.safe_load(file)['testcase']
        return test_case_data

    @allure.story('Featured精选产品接口测试')
    def test_Featured精选产品接口测试(self):
        log.info('Starting test_Featured精选产品接口测试')
        # Step: setup_admin
        log.info(f'开始执行 step: setup_admin')
        setup_admin = self.steps_dict.get('setup_admin')
        project_config = self.global_vars.get('integration_featured.yaml')
        response = RequestHandler.send_request(
            method=setup_admin['method'],
            url=project_config['host'] + self.VR.process_data(setup_admin['path']),
            headers=self.VR.process_data(setup_admin.get('headers')),
            data=self.VR.process_data(setup_admin.get('data')),
            params=self.VR.process_data(setup_admin.get('params')),
            files=self.VR.process_data(setup_admin.get('files'))
        )
        log.info(f'setup_admin 请求结果为：{response}')
        self.session_vars['setup_admin'] = response
        db_config = project_config.get('mysql')
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(setup_admin['assert']),
            response=response,
            db_config=db_config
        )

        # Step: create_product
        log.info(f'开始执行 step: create_product')
        create_product = self.steps_dict.get('create_product')
        project_config = self.global_vars.get('integration_featured.yaml')
        response = RequestHandler.send_request(
            method=create_product['method'],
            url=project_config['host'] + self.VR.process_data(create_product['path']),
            headers=self.VR.process_data(create_product.get('headers')),
            data=self.VR.process_data(create_product.get('data')),
            params=self.VR.process_data(create_product.get('params')),
            files=self.VR.process_data(create_product.get('files'))
        )
        log.info(f'create_product 请求结果为：{response}')
        self.session_vars['create_product'] = response
        db_config = project_config.get('mysql')
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(create_product['assert']),
            response=response,
            db_config=db_config
        )

        # Step: step1
        log.info(f'开始执行 step: step1')
        step1 = self.steps_dict.get('step1')
        project_config = self.global_vars.get('integration_featured.yaml')
        response = RequestHandler.send_request(
            method=step1['method'],
            url=project_config['host'] + self.VR.process_data(step1['path']),
            headers=self.VR.process_data(step1.get('headers')),
            data=self.VR.process_data(step1.get('data')),
            params=self.VR.process_data(step1.get('params')),
            files=self.VR.process_data(step1.get('files'))
        )
        log.info(f'step1 请求结果为：{response}')
        self.session_vars['step1'] = response
        db_config = project_config.get('mysql')
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(step1['assert']),
            response=response,
            db_config=db_config
        )

        # Step: step2
        log.info(f'开始执行 step: step2')
        step2 = self.steps_dict.get('step2')
        project_config = self.global_vars.get('integration_featured.yaml')
        response = RequestHandler.send_request(
            method=step2['method'],
            url=project_config['host'] + self.VR.process_data(step2['path']),
            headers=self.VR.process_data(step2.get('headers')),
            data=self.VR.process_data(step2.get('data')),
            params=self.VR.process_data(step2.get('params')),
            files=self.VR.process_data(step2.get('files'))
        )
        log.info(f'step2 请求结果为：{response}')
        self.session_vars['step2'] = response
        db_config = project_config.get('mysql')
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(step2['assert']),
            response=response,
            db_config=db_config
        )

        # Step: step3
        log.info(f'开始执行 step: step3')
        step3 = self.steps_dict.get('step3')
        project_config = self.global_vars.get('integration_featured.yaml')
        response = RequestHandler.send_request(
            method=step3['method'],
            url=project_config['host'] + self.VR.process_data(step3['path']),
            headers=self.VR.process_data(step3.get('headers')),
            data=self.VR.process_data(step3.get('data')),
            params=self.VR.process_data(step3.get('params')),
            files=self.VR.process_data(step3.get('files'))
        )
        log.info(f'step3 请求结果为：{response}')
        self.session_vars['step3'] = response
        db_config = project_config.get('mysql')
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(step3['assert']),
            response=response,
            db_config=db_config
        )

        # Step: step4
        log.info(f'开始执行 step: step4')
        step4 = self.steps_dict.get('step4')
        project_config = self.global_vars.get('integration_featured.yaml')
        response = RequestHandler.send_request(
            method=step4['method'],
            url=project_config['host'] + self.VR.process_data(step4['path']),
            headers=self.VR.process_data(step4.get('headers')),
            data=self.VR.process_data(step4.get('data')),
            params=self.VR.process_data(step4.get('params')),
            files=self.VR.process_data(step4.get('files'))
        )
        log.info(f'step4 请求结果为：{response}')
        self.session_vars['step4'] = response
        db_config = project_config.get('mysql')
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(step4['assert']),
            response=response,
            db_config=db_config
        )


        log.info(f"Test case test_Featured精选产品接口测试 completed.")
